import yfinance as yf
import requests
from supabase import create_client
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# ── TICKERS ────────────────────────────────────────────
CEDEARS = ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "META", "TSLA", "AMD", "BABA", "MELI"]
NASDAQ  = ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "META", "TSLA", "AMD", "BABA", "MELI"]
CRYPTO  = ["bitcoin", "ethereum", "solana", "cardano", "tether"]
BYMA    = ["GGAL.BA", "PAMP.BA", "BMA.BA", "ALUA.BA", "TXAR.BA", "CRES.BA", "CEPU.BA", "LOMA.BA", "VALO.BA", "SUPV.BA"]

MAPA_CATEGORIAS = {
    "Money Market":              "money_market",
    "Renta Fija":                "renta_fija",
    "Renta Variable":            "renta_variable",
    "Renta Mixta":               "mixto",
    "Plazo Fijo":                "renta_fija",
    "Renta Fija en Dólares":     "renta_fija_usd",
    "Dollar Linked":             "dollar_linked",
    "Renta Variable en Dólares": "renta_variable_usd",
    "Renta Mixta en Dólares":    "mixto_usd",
    "Infraestructura":           "infraestructura",
    "Pymes":                     "pymes",
    "Retiro":                    "retiro",
}

# ── DOLAR ──────────────────────────────────────────────
def get_dolar_ccl():
    try:
        r = requests.get("https://dolarapi.com/v1/dolares/contadoconliquidacion", timeout=10)
        return r.json().get("venta", 1285)
    except:
        return 1285

def get_dolar_mep():
    try:
        r = requests.get("https://dolarapi.com/v1/dolares/bolsa", timeout=10)
        return r.json().get("venta", 0)
    except:
        return 0

# ── YAHOO / CRYPTO ─────────────────────────────────────
def get_yahoo_prices(tickers):
    precios = {}
    try:
        data = yf.download(tickers, period="2d", interval="1d", progress=False)
        closes = data["Close"]
        for ticker in tickers:
            try:
                hoy = float(closes[ticker].iloc[-1])
                ayer = float(closes[ticker].iloc[-2])
                cambio = ((hoy - ayer) / ayer) * 100
                precios[ticker] = {"precio": round(hoy, 2), "cambio": round(cambio, 2)}
            except:
                pass
    except Exception as e:
        print(f"Error Yahoo: {e}")
    return precios

def get_crypto_prices():
    precios = {}
    try:
        ids = ",".join(CRYPTO)
        r = requests.get(
            f"https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd&include_24hr_change=true",
            timeout=10
        )
        data = r.json()
        mapa = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL", "cardano": "ADA", "tether": "USDT"}
        for id_, ticker in mapa.items():
            if id_ in data:
                precios[ticker] = {
                    "precio": data[id_]["usd"],
                    "cambio": round(data[id_].get("usd_24h_change", 0), 2)
                }
    except Exception as e:
        print(f"Error Crypto: {e}")
    return precios

# ── CAFCI ──────────────────────────────────────────────
def get_todos_los_fondos():
    try:
        print("  📡 Consultando catálogo CAFCI...")
        r = requests.get(
            "https://api.cafci.org.ar/fondo?limit=500",
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if r.status_code != 200:
            print(f"  ⚠️  CAFCI respondió {r.status_code}")
            return []
        data = r.json()
        fondos = data.get("data", [])
        print(f"  📦 Total fondos en CAFCI: {len(fondos)}")
        return fondos
    except requests.exceptions.Timeout:
        print("  ⚠️  CAFCI timeout - se reintentará en el próximo ciclo")
        return []
    except Exception as e:
        print(f"  ❌ Error obteniendo catálogo CAFCI: {e}")
        return []

def get_top_fondos_por_categoria(fondos, max_por_categoria=3):
    por_categoria = {}
    for f in fondos:
        try:
            nombre_cat = f.get("tipoFondo", {}).get("nombre", "")
            cat_interna = MAPA_CATEGORIAS.get(nombre_cat)
            if not cat_interna:
                continue
            patrimonio = float(f.get("patrimonio", 0) or 0)
            id_cafci = f.get("id")
            if not id_cafci or patrimonio <= 0:
                continue
            if cat_interna not in por_categoria:
                por_categoria[cat_interna] = []
            por_categoria[cat_interna].append({
                "id": id_cafci,
                "nombre": f.get("nombre", ""),
                "administradora": f.get("societadGerente", {}).get("nombre", ""),
                "categoria": cat_interna,
                "patrimonio": patrimonio,
            })
        except:
            continue

    seleccionados = []
    for cat, lista in por_categoria.items():
        lista.sort(key=lambda x: x["patrimonio"], reverse=True)
        top = lista[:max_por_categoria]
        seleccionados.extend(top)
        print(f"  📁 {cat}: {len(top)} fondos")

    print(f"  ✅ Total a actualizar: {len(seleccionados)}")
    return seleccionados

def get_cafci_cuotaparte(id_cafci):
    try:
        hoy = datetime.now().strftime("%Y-%m-%d")
        hace_5_dias = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        url = f"https://api.cafci.org.ar/fd?c={id_cafci}&d={hace_5_dias},{hoy}&p=1&e=1"
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        filas = r.json().get("data", [])
        if len(filas) < 2:
            return None
        filas = sorted(filas, key=lambda x: x.get("fecha", ""))
        cp_hoy = float(filas[-1].get("vcp", 0))
        cp_ayer = float(filas[-2].get("vcp", 0))
        variacion = ((cp_hoy - cp_ayer) / cp_ayer * 100) if cp_ayer > 0 else 0
        return {"cuotaparte": round(cp_hoy, 6), "variacion_diaria": round(variacion, 4)}
    except:
        return None

def get_cafci_rendimientos(id_cafci):
    try:
        hoy = datetime.now()
        fecha_30d = (hoy - timedelta(days=30)).strftime("%Y-%m-%d")
        fecha_1a  = (hoy - timedelta(days=365)).strftime("%Y-%m-%d")
        fecha_hoy = hoy.strftime("%Y-%m-%d")

        rend_30d = None
        rend_1a  = None

        r30 = requests.get(
            f"https://api.cafci.org.ar/fd?c={id_cafci}&d={fecha_30d},{fecha_hoy}&p=1&e=1",
            timeout=15, headers={"User-Agent": "Mozilla/5.0"}
        )
        datos_30 = sorted(r30.json().get("data", []), key=lambda x: x.get("fecha", ""))
        if len(datos_30) >= 2:
            cp_i = float(datos_30[0].get("vcp", 0))
            cp_f = float(datos_30[-1].get("vcp", 0))
            if cp_i > 0:
                rend_30d = round(((cp_f - cp_i) / cp_i) * 100, 2)

        r1a = requests.get(
            f"https://api.cafci.org.ar/fd?c={id_cafci}&d={fecha_1a},{fecha_hoy}&p=1&e=1",
            timeout=15, headers={"User-Agent": "Mozilla/5.0"}
        )
        datos_1a = sorted(r1a.json().get("data", []), key=lambda x: x.get("fecha", ""))
        if len(datos_1a) >= 2:
            cp_i = float(datos_1a[0].get("vcp", 0))
            cp_f = float(datos_1a[-1].get("vcp", 0))
            if cp_i > 0:
                rend_1a = round(((cp_f - cp_i) / cp_i) * 100, 2)

        return {"rendimiento_30d": rend_30d, "rendimiento_1a": rend_1a}
    except:
        return {"rendimiento_30d": None, "rendimiento_1a": None}

def actualizar_fcis():
    print("\n📊 Actualizando FCIs desde CAFCI...")
    fondos = get_todos_los_fondos()
    if not fondos:
        print("  ⚠️  No se pudo obtener el catálogo de CAFCI")
        return

    seleccionados = get_top_fondos_por_categoria(fondos, max_por_categoria=3)
    actualizados = 0

    for fondo in seleccionados:
        id_cafci = fondo["id"]
        print(f"  → [{fondo['categoria']}] {fondo['nombre'][:50]} (id={id_cafci})")

        cp_data = get_cafci_cuotaparte(id_cafci)
        if not cp_data:
            print(f"    ⚠️  Sin cuotaparte")
            continue

        rend_data = get_cafci_rendimientos(id_cafci)

        try:
            supabase.table("fci_cache").upsert({
                "id_cafci": id_cafci,
                "ticker": f"FCI_{id_cafci}",
                "nombre": fondo["nombre"],
                "categoria": fondo["categoria"],
                "cuotaparte": cp_data["cuotaparte"],
                "variacion_diaria": cp_data["variacion_diaria"],
                "rendimiento_30d": rend_data.get("rendimiento_30d"),
                "rendimiento_1a": rend_data.get("rendimiento_1a"),
                "moneda": "USD" if "usd" in fondo["categoria"] else "ARS",
                "updated_at": datetime.now().isoformat(),
            }, on_conflict="id_cafci").execute()
            print(f"    ✅ CP={cp_data['cuotaparte']:.4f} ({cp_data['variacion_diaria']:+.2f}%) | 30d={rend_data.get('rendimiento_30d')}% | 1a={rend_data.get('rendimiento_1a')}%")
            actualizados += 1
        except Exception as e:
            print(f"    ❌ Error: {e}")

    print(f"\n  📦 FCIs actualizados: {actualizados}/{len(seleccionados)}")

# ── PRECIOS CACHE ──────────────────────────────────────
def guardar_precios(ticker, precio, cambio, moneda, categoria, fuente):
    try:
        supabase.table("precios_cache").upsert({
            "ticker": ticker,
            "precio": precio,
            "variacion_pct": cambio,
            "moneda": moneda,
            "categoria": categoria,
            "fuente": fuente,
            "updated_at": datetime.now().isoformat()
        }, on_conflict="ticker").execute()
        print(f"✅ {ticker}: {precio} {moneda} ({cambio:+.2f}%)")
    except Exception as e:
        print(f"❌ Error guardando {ticker}: {e}")

# ── PUSH NOTIFICATIONS ─────────────────────────────────
def enviar_notificacion_push(token, titulo, cuerpo):
    try:
        requests.post("https://exp.host/--/api/v2/push/send", json={
            "to": token,
            "title": titulo,
            "body": cuerpo,
            "sound": "default",
        }, timeout=10)
        print(f"📲 Notificación enviada: {titulo}")
    except Exception as e:
        print(f"❌ Error enviando notificación: {e}")

# ── ALERTAS ────────────────────────────────────────────
def verificar_alertas(precios_map):
    print("\n🔔 Verificando alertas...")
    try:
        alertas = supabase.table("alertas").select("*, usuarios(push_token)").eq("activa", True).eq("disparada", False).execute()
        for alerta in alertas.data:
            ticker = alerta["ticker"]
            tipo = alerta["tipo"]
            valor = float(alerta["valor"])
            push_token = alerta.get("usuarios", {}).get("push_token")

            precio_data = precios_map.get(ticker) or precios_map.get(f"{ticker}.BA")
            if not precio_data:
                continue

            precio_actual = precio_data["precio"]
            cambio_diario = precio_data["cambio"]
            disparar = False
            mensaje = ""

            if tipo == "stop_loss" and cambio_diario <= -valor:
                disparar = True
                mensaje = f"{ticker} bajó {cambio_diario:.2f}% · Stop Loss de {valor}% alcanzado"
            elif tipo == "stop_gain" and cambio_diario >= valor:
                disparar = True
                mensaje = f"{ticker} subió {cambio_diario:.2f}% · Stop Gain de {valor}% alcanzado"
            elif tipo == "precio_exacto" and abs(precio_actual - valor) / valor < 0.01:
                disparar = True
                mensaje = f"{ticker} llegó a ${precio_actual:,.2f} · Precio objetivo alcanzado"
            elif tipo == "variacion_diaria" and abs(cambio_diario) >= valor:
                disparar = True
                direccion = "subió" if cambio_diario > 0 else "bajó"
                mensaje = f"{ticker} {direccion} {abs(cambio_diario):.2f}% hoy"

            if disparar:
                print(f"🚨 Alerta disparada: {mensaje}")
                supabase.table("alertas").update({"disparada": True}).eq("id", alerta["id"]).execute()
                if push_token:
                    enviar_notificacion_push(push_token, "⚡ Alerta A Contar", mensaje)

    except Exception as e:
        print(f"❌ Error verificando alertas: {e}")

# ── MAIN ───────────────────────────────────────────────
def main():
    print("\n🚀 Iniciando worker de precios...")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    ccl = get_dolar_ccl()
    mep = get_dolar_mep()
    print(f"💱 CCL: ${ccl} · MEP: ${mep}")
    guardar_precios("CCL", ccl, 0, "ARS", "dolar", "dolarapi")
    guardar_precios("MEP", mep, 0, "ARS", "dolar", "dolarapi")

    precios_map = {}

    print("\n📊 Obteniendo precios NYSE/NASDAQ...")
    yahoo = get_yahoo_prices(NASDAQ)
    for ticker, data in yahoo.items():
        guardar_precios(ticker, data["precio"], data["cambio"], "USD", "nasdaq", "yahoo")
        precios_map[ticker] = data
        if ticker in CEDEARS:
            precio_ars = round(data["precio"] * ccl, 2)
            guardar_precios(f"{ticker}.BA", precio_ars, data["cambio"], "ARS", "cedear", "yahoo+ccl")
            precios_map[f"{ticker}.BA"] = {"precio": precio_ars, "cambio": data["cambio"]}

    print("\n₿ Obteniendo precios crypto...")
    crypto = get_crypto_prices()
    for ticker, data in crypto.items():
        guardar_precios(ticker, data["precio"], data["cambio"], "USD", "crypto", "coingecko")
        precios_map[ticker] = data

    print("\n🇦🇷 Obteniendo precios BYMA...")
    byma = get_yahoo_prices(BYMA)
    for ticker, data in byma.items():
        ticker_limpio = ticker.replace(".BA", "")
        guardar_precios(ticker_limpio, data["precio"], data["cambio"], "ARS", "byma", "yahoo")
        precios_map[ticker_limpio] = data

    # FCIs
    actualizar_fcis()

    verificar_alertas(precios_map)

    print("\n✅ Worker finalizado!\n")

if __name__ == "__main__":
    import time
    print("⏰ Scheduler iniciado - actualizando cada 5 minutos")
    while True:
        main()
        print("💤 Esperando 5 minutos...")
        time.sleep(300)