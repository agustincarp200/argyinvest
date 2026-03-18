import yfinance as yf
import requests
from supabase import create_client
from dotenv import load_dotenv
import os
import math
from datetime import datetime

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# ── TICKERS ────────────────────────────────────────────
CEDEARS = ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "META", "TSLA", "AMD", "BABA", "MELI"]
NASDAQ  = ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "META", "TSLA", "AMD", "BABA", "MELI"]
CRYPTO  = ["bitcoin", "ethereum", "solana", "cardano", "tether"]
BYMA    = [
    "GGAL.BA", "PAMP.BA", "BMA.BA", "ALUA.BA", "TXAR.BA",
    "CRES.BA", "CEPU.BA", "LOMA.BA", "VALO.BA", "SUPV.BA",
    "VIST.BA",
]

# Bonos y letras CER
CER_BONOS = [
    "TX26.BA", "TX27.BA", "TX28.BA", "TX29.BA", "TX30.BA",
    "DICP.BA", "PARP.BA",
    "X18F5.BA", "X21A5.BA", "X16G5.BA", "X17O5.BA",
    "CUAP.BA", "PR13.BA",
    "TZX26.BA", "TZX27.BA", "TZX28.BA",
    "S31G6.BA", "S30O6.BA",
]

# Ratio CEDEARs de acciones
CEDEAR_RATIO = {
    "AAPL":  1/20, "GOOGL": 1/58, "MSFT":  1/25, "AMZN":  1/144,
    "NVDA":  1/10, "META":  1/10, "TSLA":  1/15, "AMD":   1/10,
    "BABA":  1/9,  "MELI":  1/100,
}

# ── ETFs CEDEAR ────────────────────────────────────────
CEDEARS_ETF = [
    "SPY", "QQQ", "IVV", "DIA", "IWM",
    "EEM", "IEMG", "ACWI", "EFA", "IEUR", "EWJ",
    "XLE", "XLF", "EWZ",
    "GLD", "SLV", "GDX",
    "ARKK", "IBB",
    "IBIT", "ETHA",
    "SH", "PSQ",
    "VIG", "IJH",
    "USO", "FXI",
]

CEDEAR_ETF_RATIO = {
    "SPY":  1/20, "QQQ":  1/20, "IVV":  1/20, "DIA":  1/20,
    "IWM":  1/10, "EEM":  1/5,  "IEMG": 1/12, "ACWI": 1/26,
    "EFA":  1/18, "IEUR": 1/11, "EWJ":  1/14, "XLE":  1/2,
    "XLF":  1/2,  "EWZ":  1/2,  "GLD":  1/50, "SLV":  1/6,
    "GDX":  1/10, "ARKK": 1/10, "IBB":  1/27, "IBIT": 1/10,
    "ETHA": 1/5,  "SH":   1/8,  "PSQ":  1/8,  "VIG":  1/39,
    "IJH":  1/12, "USO":  1/15, "FXI":  1/5,
}

# ── FCIs conocidos: ticker_corto → fragmento del nombre en ArgentinaDatos ──
# El worker buscará el fondo cuyo nombre contenga el fragmento y guardará
# el precio en precios_cache con el ticker corto para que la app lo encuentre
FCI_TICKERS_MAP = {
    "ADBAICA":  "adcap cobertura",
    "PCOMAGB":  "compass renta mixta",
    "IOLDOLD":  "iol dolar",
    "BALANZ":   "balanz ahorro",
    "COMAGBS":  "compass",
    "MAGPESO":  "mariva",
    "SUPAHORO": "supervielle ahorro",
    "GALAHORO": "galicia ahorro",
    "PELLUCRO":  "pellegrini",
    "PRIUSD":   "premier capital",
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

# ── YAHOO ──────────────────────────────────────────────
def get_yahoo_prices(tickers):
    precios = {}
    try:
        data = yf.download(tickers, period="2d", interval="1d", progress=False)
        closes = data["Close"]
        for ticker in tickers:
            try:
                hoy = float(closes[ticker].iloc[-1])
                ayer = float(closes[ticker].iloc[-2])
                if math.isnan(hoy) or math.isnan(ayer):
                    continue
                cambio = ((hoy - ayer) / ayer) * 100
                precios[ticker] = {"precio": round(hoy, 2), "cambio": round(cambio, 2)}
            except:
                pass
    except Exception as e:
        print(f"Error Yahoo: {e}")
    return precios

# ── CRYPTO ─────────────────────────────────────────────
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

# ── CER ────────────────────────────────────────────────
def get_cer_coeficiente():
    try:
        r = requests.get("https://api.argentinadatos.com/v1/finanzas/indices/cer", timeout=10)
        if r.status_code != 200:
            print(f"  ⚠️  ArgentinaDatos CER respondió {r.status_code}")
            return None
        data = r.json()
        if not data or not isinstance(data, list):
            return None
        ultimo = data[-1]
        penultimo = data[-2] if len(data) >= 2 else None
        valor_hoy = float(ultimo.get("valor", 0))
        valor_ayer = float(penultimo.get("valor", 0)) if penultimo else 0
        variacion_diaria = ((valor_hoy - valor_ayer) / valor_ayer * 100) if valor_ayer > 0 else 0
        fecha = ultimo.get("fecha", "")
        print(f"  📈 CER hoy: {valor_hoy:.6f} ({variacion_diaria:+.4f}%) · Fecha: {fecha}")
        return {
            "valor": valor_hoy,
            "valor_ayer": valor_ayer,
            "variacion_diaria": variacion_diaria,
            "fecha": fecha,
        }
    except Exception as e:
        print(f"  ❌ Error obteniendo CER: {e}")
        return None

def get_precio_cache(ticker_limpio):
    try:
        res = supabase.table("precios_cache").select("precio").eq("ticker", ticker_limpio).execute()
        if res.data:
            return float(res.data[0]["precio"])
        return None
    except:
        return None

def actualizar_cer():
    print("\n📐 Actualizando bonos CER...")
    cer_data = get_cer_coeficiente()
    if not cer_data:
        print("  ⚠️  No se pudo obtener coeficiente CER, saltando fallback")

    if cer_data and cer_data["valor"] > 0:
        guardar_precios("CER", cer_data["valor"], cer_data["variacion_diaria"], "ARS", "indice", "argentinadatos")

    yahoo_cer = get_yahoo_prices(CER_BONOS)
    actualizados_yahoo = 0
    actualizados_cer = 0

    for ticker_ba in CER_BONOS:
        ticker_limpio = ticker_ba.replace(".BA", "")
        if ticker_ba in yahoo_cer:
            data = yahoo_cer[ticker_ba]
            guardar_precios(ticker_limpio, data["precio"], data["cambio"], "ARS", "bono_ars", "yahoo")
            actualizados_yahoo += 1
        elif cer_data:
            precio_base = get_precio_cache(ticker_limpio)
            if precio_base and precio_base > 0:
                precio_ajustado = round(precio_base * (1 + cer_data["variacion_diaria"] / 100), 2)
                guardar_precios(ticker_limpio, precio_ajustado, cer_data["variacion_diaria"], "ARS", "bono_ars", "cer_coeficiente")
                actualizados_cer += 1
                print(f"  🔄 {ticker_limpio}: CER {precio_base:.2f} → {precio_ajustado:.2f} ({cer_data['variacion_diaria']:+.4f}%)")
            else:
                print(f"  ⚠️  {ticker_limpio}: sin precio base en cache")
        else:
            print(f"  ⚠️  {ticker_limpio}: sin Yahoo ni CER disponible")

    print(f"  ✅ CER actualizados: {actualizados_yahoo} Yahoo · {actualizados_cer} por coeficiente")

# ── FCIs ARGENTINADATOS ────────────────────────────────
ENDPOINTS_FCI = {
    "money_market":   "https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo",
    "renta_fija":     "https://api.argentinadatos.com/v1/finanzas/fci/rentaFija/ultimo",
    "renta_variable": "https://api.argentinadatos.com/v1/finanzas/fci/rentaVariable/ultimo",
    "mixto":          "https://api.argentinadatos.com/v1/finanzas/fci/rentaMixta/ultimo",
    "otros":          "https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo",
}

def get_fci_por_categoria(categoria, url):
    try:
        r = requests.get(url, timeout=20)
        if r.status_code != 200:
            print(f"  ⚠️  ArgentinaDatos [{categoria}] respondió {r.status_code}")
            return []
        data = r.json()
        print(f"  📁 {categoria}: {len(data)} fondos recibidos")
        return data
    except Exception as e:
        print(f"  ❌ Error [{categoria}]: {e}")
        return []

def get_fci_penultimo(url):
    try:
        url_pen = url.replace("/ultimo", "/penultimo")
        r = requests.get(url_pen, timeout=20)
        if r.status_code != 200:
            return {}
        data = r.json()
        return {item["fondo"]: float(item.get("vcp", 0)) for item in data}
    except:
        return {}

def actualizar_fcis():
    print("\n📊 Actualizando FCIs desde ArgentinaDatos...")
    actualizados = 0
    fci_encontrados = {}  # ticker_corto → {vcp, variacion}

    for categoria, url in ENDPOINTS_FCI.items():
        fondos_hoy = get_fci_por_categoria(categoria, url)
        if not fondos_hoy:
            continue

        vcps_ayer = get_fci_penultimo(url)

        for fondo in fondos_hoy:
            nombre = fondo.get("fondo", "")
            vcp_hoy = float(fondo.get("vcp", 0) or 0)
            if vcp_hoy <= 0 or not nombre:
                continue

            vcp_ayer = vcps_ayer.get(nombre, 0)
            variacion = ((vcp_hoy - vcp_ayer) / vcp_ayer * 100) if vcp_ayer > 0 else 0
            ticker_largo = "FCI_" + nombre[:40].upper().replace(" ", "_").replace("/", "_").replace("-", "_")

            cat_interna = categoria
            nombre_lower = nombre.lower()
            if "dollar" in nombre_lower or "dólar" in nombre_lower or "usd" in nombre_lower:
                cat_interna = "dollar_linked"
            elif "cer" in nombre_lower or "ajust" in nombre_lower:
                cat_interna = "cer"
            elif "infraestructura" in nombre_lower:
                cat_interna = "infraestructura"
            elif "pyme" in nombre_lower:
                cat_interna = "pymes"

            id_unico = abs(hash(nombre)) % 10**8
            moneda = "USD" if cat_interna in ["dollar_linked", "renta_fija_usd", "renta_variable_usd"] else "ARS"

            try:
                supabase.table("fci_cache").upsert({
                    "id_cafci": id_unico,
                    "ticker": ticker_largo,
                    "nombre": nombre,
                    "categoria": cat_interna,
                    "cuotaparte": round(vcp_hoy, 6),
                    "variacion_diaria": round(variacion, 4),
                    "rendimiento_30d": None,
                    "rendimiento_1a": None,
                    "moneda": moneda,
                    "updated_at": datetime.now().isoformat(),
                }, on_conflict="id_cafci").execute()
                actualizados += 1
            except Exception as e:
                print(f"    ❌ Error guardando {nombre[:30]}: {e}")

            # Buscar si este fondo matchea algún ticker corto conocido
            for ticker_corto, fragmento in FCI_TICKERS_MAP.items():
                if fragmento.lower() in nombre_lower:
                    fci_encontrados[ticker_corto] = {
                        "vcp": vcp_hoy,
                        "variacion": variacion,
                        "moneda": moneda,
                        "nombre": nombre,
                    }

    # Guardar FCIs conocidos en precios_cache con ticker corto
    for ticker_corto, data in fci_encontrados.items():
        guardar_precios(ticker_corto, data["vcp"], data["variacion"], data["moneda"], "fci", "argentinadatos_fci")
        print(f"  📦 FCI {ticker_corto}: {data['vcp']:.4f} ({data['nombre'][:30]})")

    print(f"\n  📦 FCIs actualizados: {actualizados} · Conocidos en cache: {len(fci_encontrados)}")

# ── PRECIOS CACHE ──────────────────────────────────────
def guardar_precios(ticker, precio, cambio, moneda, categoria, fuente):
    try:
        if math.isnan(precio) or math.isinf(precio):
            print(f"⚠️  {ticker}: precio inválido ({precio}), saltando")
            return
        if math.isnan(cambio) or math.isinf(cambio):
            cambio = 0.0
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
        alertas = supabase.table("alertas").select("*").eq("activa", True).eq("disparada", False).execute()
        for alerta in alertas.data:
            ticker = alerta["ticker"]
            tipo = alerta["tipo"]
            valor = float(alerta["valor"])
            usuario_id = alerta["usuario_id"]

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
                usuario = supabase.table("usuarios").select("push_token").eq("id", usuario_id).execute()
                push_token = usuario.data[0].get("push_token") if usuario.data else None
                if push_token:
                    enviar_notificacion_push(push_token, "⚡ Alerta A Contar", mensaje)

    except Exception as e:
        print(f"❌ Error verificando alertas: {e}")

# ── EVENTOS CALENDARIO ────────────────────────────────
BOND_EVENTS = [
    {"ticker": "AL29", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 1.75,  "moneda": "USD", "desc": "Cupón AL29"},
    {"ticker": "AL29", "tipo": "cupon",        "fecha": "2027-01-09", "monto": 1.75,  "moneda": "USD", "desc": "Cupón AL29"},
    {"ticker": "AL29", "tipo": "amortizacion", "fecha": "2027-01-09", "monto": 4.0,   "moneda": "USD", "desc": "Amort. AL29"},
    {"ticker": "AL29", "tipo": "amortizacion", "fecha": "2029-07-09", "monto": 96.0,  "moneda": "USD", "desc": "Vto. AL29"},
    {"ticker": "AL30", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 0.50,  "moneda": "USD", "desc": "Cupón AL30"},
    {"ticker": "AL30", "tipo": "cupon",        "fecha": "2027-01-09", "monto": 0.50,  "moneda": "USD", "desc": "Cupón AL30"},
    {"ticker": "AL30", "tipo": "cupon",        "fecha": "2027-07-09", "monto": 0.50,  "moneda": "USD", "desc": "Cupón AL30"},
    {"ticker": "AL30", "tipo": "amortizacion", "fecha": "2030-07-09", "monto": 100.0, "moneda": "USD", "desc": "Vto. AL30"},
    {"ticker": "AL35", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 0.75,  "moneda": "USD", "desc": "Cupón AL35"},
    {"ticker": "AL35", "tipo": "amortizacion", "fecha": "2035-07-09", "monto": 100.0, "moneda": "USD", "desc": "Vto. AL35"},
    {"ticker": "GD29", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 2.125, "moneda": "USD", "desc": "Cupón GD29"},
    {"ticker": "GD29", "tipo": "amortizacion", "fecha": "2029-07-09", "monto": 100.0, "moneda": "USD", "desc": "Vto. GD29"},
    {"ticker": "GD30", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 0.75,  "moneda": "USD", "desc": "Cupón GD30"},
    {"ticker": "GD30", "tipo": "amortizacion", "fecha": "2030-07-09", "monto": 100.0, "moneda": "USD", "desc": "Vto. GD30"},
    {"ticker": "GD35", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 1.75,  "moneda": "USD", "desc": "Cupón GD35"},
    {"ticker": "GD35", "tipo": "amortizacion", "fecha": "2035-01-09", "monto": 100.0, "moneda": "USD", "desc": "Vto. GD35"},
    {"ticker": "GD38", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 2.50,  "moneda": "USD", "desc": "Cupón GD38"},
    {"ticker": "GD38", "tipo": "amortizacion", "fecha": "2038-01-09", "monto": 100.0, "moneda": "USD", "desc": "Vto. GD38"},
    {"ticker": "GD41", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 2.50,  "moneda": "USD", "desc": "Cupón GD41"},
    {"ticker": "GD41", "tipo": "amortizacion", "fecha": "2041-01-09", "monto": 100.0, "moneda": "USD", "desc": "Vto. GD41"},
    {"ticker": "GD46", "tipo": "cupon",        "fecha": "2026-07-09", "monto": 3.625, "moneda": "USD", "desc": "Cupón GD46"},
    {"ticker": "GD46", "tipo": "amortizacion", "fecha": "2046-01-09", "monto": 100.0, "moneda": "USD", "desc": "Vto. GD46"},
    {"ticker": "TX26",  "tipo": "cupon",        "fecha": "2026-05-09", "monto": None, "moneda": "ARS", "desc": "Cupón CER TX26"},
    {"ticker": "TX26",  "tipo": "amortizacion", "fecha": "2026-11-09", "monto": None, "moneda": "ARS", "desc": "Vto. TX26"},
    {"ticker": "TX28",  "tipo": "cupon",        "fecha": "2026-05-09", "monto": None, "moneda": "ARS", "desc": "Cupón CER TX28"},
    {"ticker": "TX28",  "tipo": "cupon",        "fecha": "2026-11-09", "monto": None, "moneda": "ARS", "desc": "Cupón CER TX28"},
    {"ticker": "TX28",  "tipo": "amortizacion", "fecha": "2028-11-09", "monto": None, "moneda": "ARS", "desc": "Vto. TX28"},
    {"ticker": "TZX26", "tipo": "vencimiento",  "fecha": "2026-06-30", "monto": None, "moneda": "ARS", "desc": "Vto. TZX26"},
    {"ticker": "TZX27", "tipo": "vencimiento",  "fecha": "2027-06-30", "monto": None, "moneda": "ARS", "desc": "Vto. TZX27"},
    {"ticker": "S30J6", "tipo": "vencimiento",  "fecha": "2026-06-30", "monto": None, "moneda": "ARS", "desc": "Vto. LECAP Jun 2026"},
    {"ticker": "S31G6", "tipo": "vencimiento",  "fecha": "2026-07-31", "monto": None, "moneda": "ARS", "desc": "Vto. LECAP Jul 2026"},
    {"ticker": "S30O6", "tipo": "vencimiento",  "fecha": "2026-10-30", "monto": None, "moneda": "ARS", "desc": "Vto. LECAP Oct 2026"},
    {"ticker": "S31D6", "tipo": "vencimiento",  "fecha": "2026-12-31", "monto": None, "moneda": "ARS", "desc": "Vto. LECAP Dic 2026"},
]

DIVIDEND_TICKERS_ACCIONES = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD",
    "KO", "PEP", "WMT", "JPM", "BAC", "MCD", "NKE", "DIS",
    "MELI", "BABA", "PYPL", "UBER",
    "SPY", "QQQ", "IVV", "DIA", "IWM", "GLD", "EEM", "XLE", "XLF",
    "VIG", "EWZ", "GDX",
]

def get_dividendos_yahoo(tickers: list) -> list:
    eventos = []
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            info = t.info
            ex_div_date = info.get("exDividendDate")
            div_rate = info.get("dividendRate") or info.get("trailingAnnualDividendRate")
            if ex_div_date and div_rate and div_rate > 0:
                from datetime import timezone
                fecha = datetime.fromtimestamp(ex_div_date, tz=timezone.utc).strftime("%Y-%m-%d")
                div_por_pago = round(div_rate / 4, 4)
                eventos.append({
                    "ticker": ticker, "tipo": "dividendo", "fecha": fecha,
                    "monto": div_por_pago, "moneda": "USD", "desc": f"Dividendo {ticker} (ex-date)"
                })
                print(f"  💵 {ticker}: ex-div {fecha} · ${div_por_pago:.4f}/acción")
        except Exception as e:
            print(f"  ⚠️  {ticker} dividendo error: {e}")
    return eventos

def actualizar_eventos_calendario():
    print("\n📅 Actualizando eventos de calendario...")
    try:
        from datetime import date
        hoy = date.today().isoformat()
        supabase.table("eventos_calendario").delete().gte("fecha", hoy).execute()
    except Exception as e:
        print(f"  ⚠️  Error limpiando eventos: {e}")

    todos_eventos = list(BOND_EVENTS)
    print(f"  📋 Bonos/Letras: {len(BOND_EVENTS)} eventos cargados")

    print("  🔍 Buscando dividendos en Yahoo Finance...")
    divs = get_dividendos_yahoo(DIVIDEND_TICKERS_ACCIONES)
    todos_eventos.extend(divs)
    print(f"  💵 Dividendos encontrados: {len(divs)}")

    insertados = 0
    for ev in todos_eventos:
        try:
            supabase.table("eventos_calendario").insert({
                "ticker": ev["ticker"], "tipo": ev["tipo"], "fecha": ev["fecha"],
                "monto_por_unidad": ev.get("monto"), "moneda": ev.get("moneda", "USD"),
                "descripcion": ev.get("desc", ""),
            }).execute()
            insertados += 1
        except Exception as e:
            print(f"  ❌ Error insertando {ev['ticker']} {ev['fecha']}: {e}")

    print(f"  ✅ Eventos calendario actualizados: {insertados}")

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
    CEDEARS_BA = [f"{t}.BA" for t in CEDEARS]
    yahoo_ba = get_yahoo_prices(CEDEARS_BA)

    for ticker, data in yahoo.items():
        guardar_precios(ticker, data["precio"], data["cambio"], "USD", "nasdaq", "yahoo")
        precios_map[ticker] = data

        if ticker in CEDEARS:
            ticker_ba = f"{ticker}.BA"
            if ticker_ba in yahoo_ba:
                data_ba = yahoo_ba[ticker_ba]
                guardar_precios(ticker_ba, data_ba["precio"], data_ba["cambio"], "ARS", "cedear", "yahoo_byma")
                precios_map[ticker_ba] = data_ba
                print(f"   → CEDEAR {ticker}: BYMA real ARS ${data_ba['precio']:,.2f}")
            else:
                ratio = CEDEAR_RATIO.get(ticker, 1.0)
                precio_ars = round(data["precio"] * ccl * ratio, 2)
                guardar_precios(ticker_ba, precio_ars, data["cambio"], "ARS", "cedear", "yahoo+ccl")
                precios_map[ticker_ba] = {"precio": precio_ars, "cambio": data["cambio"]}
                print(f"   → CEDEAR {ticker}: fallback CCL ARS ${precio_ars:,.2f}")

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

    print("\n📊 Obteniendo precios CEDEARs de ETF...")
    CEDEARS_ETF_BA = [f"{t}.BA" for t in CEDEARS_ETF]
    yahoo_etf_ba = get_yahoo_prices(CEDEARS_ETF_BA)
    yahoo_etf_usd = get_yahoo_prices(CEDEARS_ETF)

    for ticker in CEDEARS_ETF:
        ticker_ba = f"{ticker}.BA"
        data_usd = yahoo_etf_usd.get(ticker)
        data_ba = yahoo_etf_ba.get(ticker_ba)

        if data_usd:
            guardar_precios(ticker, data_usd["precio"], data_usd["cambio"], "USD", "cedear", "yahoo")
            precios_map[ticker] = data_usd

        if data_ba:
            guardar_precios(ticker_ba, data_ba["precio"], data_ba["cambio"], "ARS", "cedear", "yahoo_byma")
            precios_map[ticker_ba] = data_ba
            print(f"   → ETF {ticker}: BYMA real ARS ${data_ba['precio']:,.2f}")
        elif data_usd:
            ratio = CEDEAR_ETF_RATIO.get(ticker, 1.0)
            precio_ars = round(data_usd["precio"] * ccl * ratio, 2)
            guardar_precios(ticker_ba, precio_ars, data_usd["cambio"], "ARS", "cedear", "yahoo+ccl")
            precios_map[ticker_ba] = {"precio": precio_ars, "cambio": data_usd["cambio"]}
            print(f"   → ETF {ticker}: fallback CCL ARS ${precio_ars:,.2f}")

    actualizar_cer()
    actualizar_fcis()
    verificar_alertas(precios_map)
    actualizar_eventos_calendario()
    print("\n✅ Worker finalizado!\n")

if __name__ == "__main__":
    import time
    print("⏰ Scheduler iniciado - actualizando cada 5 minutos")
    while True:
        main()
        print("💤 Esperando 5 minutos...")
        time.sleep(300)
