export type TickerSugerido = {
  ticker: string;
  nombre: string;
  categoria: string;
  moneda: 'ARS' | 'USD';
};

export const TICKERS_CONOCIDOS: TickerSugerido[] = [
  // CEDEARs
  { ticker: 'AAPL', nombre: 'Apple Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'GOOGL', nombre: 'Alphabet (Google)', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'MSFT', nombre: 'Microsoft Corp.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'AMZN', nombre: 'Amazon.com Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'NVDA', nombre: 'NVIDIA Corp.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'META', nombre: 'Meta Platforms', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'TSLA', nombre: 'Tesla Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'AMD', nombre: 'Advanced Micro Devices', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'BABA', nombre: 'Alibaba Group', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'MELI', nombre: 'MercadoLibre Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'NFLX', nombre: 'Netflix Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'DIS', nombre: 'The Walt Disney Co.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'PYPL', nombre: 'PayPal Holdings', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'UBER', nombre: 'Uber Technologies', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'ABNB', nombre: 'Airbnb Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'SPOT', nombre: 'Spotify Technology', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'INTC', nombre: 'Intel Corp.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'ORCL', nombre: 'Oracle Corp.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'CRM', nombre: 'Salesforce Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'SHOP', nombre: 'Shopify Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'SQ', nombre: 'Block Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'SNAP', nombre: 'Snap Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'COIN', nombre: 'Coinbase Global', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'WMT', nombre: 'Walmart Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'JPM', nombre: 'JPMorgan Chase', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'BAC', nombre: 'Bank of America', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'KO', nombre: 'Coca-Cola Co.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'PEP', nombre: 'PepsiCo Inc.', categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'MCD', nombre: "McDonald's Corp.", categoria: 'cedear', moneda: 'ARS' },
  { ticker: 'NKE', nombre: 'Nike Inc.', categoria: 'cedear', moneda: 'ARS' },

  // BYMA
  { ticker: 'GGAL', nombre: 'Grupo Financiero Galicia', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'PAMP', nombre: 'Pampa Energía', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'BMA', nombre: 'Banco Macro', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'ALUA', nombre: 'Aluar Aluminio', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'TXAR', nombre: 'Ternium Argentina', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'CRES', nombre: 'Cresud', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'CEPU', nombre: 'Central Puerto', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'LOMA', nombre: 'Loma Negra', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'VALO', nombre: 'Grupo Financiero Valores', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'SUPV', nombre: 'Grupo Supervielle', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'YPF', nombre: 'YPF S.A.', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'TGSU2', nombre: 'Transportadora Gas del Sur', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'TECO2', nombre: 'Telecom Argentina', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'COME', nombre: 'Sociedad Comercial del Plata', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'EDN', nombre: 'Edenor', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'IRSA', nombre: 'IRSA Inversiones', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'BYMA', nombre: 'BYMA', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'HARG', nombre: 'Holcim Argentina', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'MOLI', nombre: 'Molinos Río de la Plata', categoria: 'byma', moneda: 'ARS' },
  { ticker: 'AGRO', nombre: 'Agrometal', categoria: 'byma', moneda: 'ARS' },

  // Crypto
  { ticker: 'BTC', nombre: 'Bitcoin', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'ETH', nombre: 'Ethereum', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'SOL', nombre: 'Solana', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'ADA', nombre: 'Cardano', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'USDT', nombre: 'Tether', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'BNB', nombre: 'BNB', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'XRP', nombre: 'Ripple', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'DOGE', nombre: 'Dogecoin', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'DOT', nombre: 'Polkadot', categoria: 'crypto', moneda: 'USD' },
  { ticker: 'AVAX', nombre: 'Avalanche', categoria: 'crypto', moneda: 'USD' },

  // Bonos USD
  { ticker: 'AL29', nombre: 'Bonar 2029', categoria: 'bono_usd', moneda: 'USD' },
  { ticker: 'AL30', nombre: 'Bonar 2030', categoria: 'bono_usd', moneda: 'USD' },
  { ticker: 'AL35', nombre: 'Bonar 2035', categoria: 'bono_usd', moneda: 'USD' },
  { ticker: 'GD29', nombre: 'Global 2029', categoria: 'bono_usd', moneda: 'USD' },
  { ticker: 'GD30', nombre: 'Global 2030', categoria: 'bono_usd', moneda: 'USD' },
  { ticker: 'GD35', nombre: 'Global 2035', categoria: 'bono_usd', moneda: 'USD' },
  { ticker: 'GD38', nombre: 'Global 2038', categoria: 'bono_usd', moneda: 'USD' },
  { ticker: 'GD41', nombre: 'Global 2041', categoria: 'bono_usd', moneda: 'USD' },
  { ticker: 'GD46', nombre: 'Global 2046', categoria: 'bono_usd', moneda: 'USD' },

  // Bonos ARS
  { ticker: 'TX26', nombre: 'Boncer 2026', categoria: 'bono_ars', moneda: 'ARS' },
  { ticker: 'TX28', nombre: 'Boncer 2028', categoria: 'bono_ars', moneda: 'ARS' },
  { ticker: 'TZXD5', nombre: 'Bono Dollar-Linked Dic 2025', categoria: 'bono_ars', moneda: 'ARS' },

  // Letras
  { ticker: 'S31E5', nombre: 'LECAP Ene 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S28F5', nombre: 'LECAP Feb 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S31M5', nombre: 'LECAP Mar 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S30A5', nombre: 'LECAP Abr 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S30Y5', nombre: 'LECAP May 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S18J5', nombre: 'LECAP Jun 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S31L5', nombre: 'LECAP Jul 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S29G5', nombre: 'LECAP Ago 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S30S5', nombre: 'LECAP Sep 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S31O5', nombre: 'LECAP Oct 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S28N5', nombre: 'LECAP Nov 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S31D5', nombre: 'LECAP Dic 2025', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S30J6', nombre: 'LECAP Jun 2026', categoria: 'letra', moneda: 'ARS' },
  { ticker: 'S31D6', nombre: 'LECAP Dic 2026', categoria: 'letra', moneda: 'ARS' },
];

export function buscarTickers(query: string): TickerSugerido[] {
  if (query.length < 1) return [];
  const q = query.toUpperCase();
  return TICKERS_CONOCIDOS.filter(t =>
    t.ticker.startsWith(q) || t.nombre.toUpperCase().includes(q)
  ).slice(0, 6);
}

export const COLORES_CATEGORIA: Record<string, string> = {
  cedear: '#F5C842',
  byma: '#4D9EFF',
  nasdaq: '#A855F7',
  crypto: '#F59E0B',
  bono_ars: '#FF9D4D',
  bono_usd: '#FF6B35',
  letra: '#00C9A7',
  on: '#C084FC',
  fci: '#22D3EE',
};