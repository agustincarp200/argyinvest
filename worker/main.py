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
        data = r.json()
        return data.get("venta", 1285)
    except:
        return 1285

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

def main():
    print("\n🚀 Iniciando worker de precios...")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Dólar CCL
    ccl = get_dolar_ccl()
    print(f"💱 Dólar CCL: ${ccl}")
    guardar_precios("CCL", ccl, 0, "ARS", "dolar", "dolarapi")

    # Precios NYSE/NASDAQ en USD
    print("\n📊 Obteniendo precios NYSE/NASDAQ...")
    yahoo = get_yahoo_prices(NASDAQ)
    for ticker, data in yahoo.items():
        guardar_precios(ticker, data["precio"], data["cambio"], "USD", "nasdaq", "yahoo")
        # CEDEARs = precio USD * CCL
        if ticker in CEDEARS:
            precio_ars = round(data["precio"] * ccl, 2)
            guardar_precios(f"{ticker}.BA", precio_ars, data["cambio"], "ARS", "cedear", "yahoo+ccl")

    # Crypto
    print("\n₿ Obteniendo precios crypto...")
    crypto = get_crypto_prices()
    for ticker, data in crypto.items():
        guardar_precios(ticker, data["precio"], data["cambio"], "USD", "crypto", "coingecko")
# Precios BYMA
    print("\n🇦🇷 Obteniendo precios BYMA...")
    byma = get_yahoo_prices(BYMA)
    for ticker, data in byma.items():
        ticker_limpio = ticker.replace(".BA", "")
        guardar_precios(ticker_limpio, data["precio"], data["cambio"], "ARS", "byma", "yahoo")
    print("\n✅ Worker finalizado!\n")

if __name__ == "__main__":
    import time
    print("⏰ Scheduler iniciado - actualizando cada 5 minutos")
    while True:
        main()
        print("💤 Esperando 5 minutos...")
        time.sleep(300)