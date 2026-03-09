import yfinance as yf
import requests
from supabase import create_client
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# ── TICKERS ────────────────────────────────────────────
CEDEARS = ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "META", "TSLA", "AMD", "BABA", "MELI"]
NASDAQ  = ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "META", "TSLA", "AMD", "BABA", "MELI"]
CRYPTO  = ["bitcoin", "ethereum", "solana", "cardano", "tether"]
BYMA    = ["GGAL.BA", "PAMP.BA", "BMA.BA", "ALUA.BA", "TXAR.BA", "CRES.BA", "CEPU.BA", "LOMA.BA", "VALO.BA", "SUPV.BA"]

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

def enviar_notificacion_push(token, titulo, cuerpo):
    try:
        r = requests.post("https://exp.host/--/api/v2/push/send", json={
            "to": token,
            "title": titulo,
            "body": cuerpo,
            "sound": "default",
        }, timeout=10)
        print(f"📲 Notificación enviada: {titulo}")
    except Exception as e:
        print(f"❌ Error enviando notificación: {e}")

def verificar_alertas(precios_map):
    print("\n🔔 Verificando alertas...")
    try:
        # Obtener alertas activas y no disparadas
        alertas = supabase.table("alertas").select("*, usuarios(push_token)").eq("activa", True).eq("disparada", False).execute()

        for alerta in alertas.data:
            ticker = alerta["ticker"]
            tipo = alerta["tipo"]
            valor = float(alerta["valor"])
            push_token = alerta.get("usuarios", {}).get("push_token")

            # Buscar precio actual
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
                mensaje = f"{ticker} {direccion} {abs(cambio_diario):.2f}% hoy · Variación de {valor}% alcanzada"

            if disparar:
                print(f"🚨 Alerta disparada: {mensaje}")
                # Marcar como disparada
                supabase.table("alertas").update({"disparada": True}).eq("id", alerta["id"]).execute()
                # Enviar push si tiene token
                if push_token:
                    enviar_notificacion_push(push_token, "⚡ Alerta A Contar", mensaje)

    except Exception as e:
        print(f"❌ Error verificando alertas: {e}")

def main():
    print("\n🚀 Iniciando worker de precios...")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Dólar CCL y MEP
    ccl = get_dolar_ccl()
    mep = get_dolar_mep()
    print(f"💱 CCL: ${ccl} · MEP: ${mep}")
    guardar_precios("CCL", ccl, 0, "ARS", "dolar", "dolarapi")
    guardar_precios("MEP", mep, 0, "ARS", "dolar", "dolarapi")

    # Mapa global de precios para alertas
    precios_map = {}

    # NYSE/NASDAQ
    print("\n📊 Obteniendo precios NYSE/NASDAQ...")
    yahoo = get_yahoo_prices(NASDAQ)
    for ticker, data in yahoo.items():
        guardar_precios(ticker, data["precio"], data["cambio"], "USD", "nasdaq", "yahoo")
        precios_map[ticker] = data
        if ticker in CEDEARS:
            precio_ars = round(data["precio"] * ccl, 2)
            guardar_precios(f"{ticker}.BA", precio_ars, data["cambio"], "ARS", "cedear", "yahoo+ccl")
            precios_map[f"{ticker}.BA"] = {"precio": precio_ars, "cambio": data["cambio"]}

    # Crypto
    print("\n₿ Obteniendo precios crypto...")
    crypto = get_crypto_prices()
    for ticker, data in crypto.items():
        guardar_precios(ticker, data["precio"], data["cambio"], "USD", "crypto", "coingecko")
        precios_map[ticker] = data

    # BYMA
    print("\n🇦🇷 Obteniendo precios BYMA...")
    byma = get_yahoo_prices(BYMA)
    for ticker, data in byma.items():
        ticker_limpio = ticker.replace(".BA", "")
        guardar_precios(ticker_limpio, data["precio"], data["cambio"], "ARS", "byma", "yahoo")
        precios_map[ticker_limpio] = data

    # Verificar alertas
    verificar_alertas(precios_map)

    print("\n✅ Worker finalizado!\n")

if __name__ == "__main__":
    import time
    print("⏰ Scheduler iniciado - actualizando cada 5 minutos")
    while True:
        main()
        print("💤 Esperando 5 minutos...")
        time.sleep(300)