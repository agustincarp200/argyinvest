export type TipoInstrumento = 'letra' | 'bono_ars' | 'bono_usd' | 'on';

export type Pago = {
  fecha: string; // YYYY-MM-DD
  tipo: 'cupon' | 'amortizacion' | 'vencimiento';
  pct: number; // % sobre valor nominal
};

export type InstrumentoRentaFija = {
  ticker: string;
  nombre: string;
  tipo: TipoInstrumento;
  moneda: 'ARS' | 'USD';
  vencimiento: string;
  tasa_cupon?: number; // anual %
  pagos: Pago[];
  descripcion?: string;
};

export const INSTRUMENTOS_RENTA_FIJA: InstrumentoRentaFija[] = [

  // ── LETRAS DEL TESORO (descuento puro, un solo pago al vencimiento) ──
  {
    ticker: 'S31E5', nombre: 'LECAP Ene 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-01-31',
    pagos: [{ fecha: '2025-01-31', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S28F5', nombre: 'LECAP Feb 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-02-28',
    pagos: [{ fecha: '2025-02-28', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S31M5', nombre: 'LECAP Mar 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-03-31',
    pagos: [{ fecha: '2025-03-31', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S30A5', nombre: 'LECAP Abr 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-04-30',
    pagos: [{ fecha: '2025-04-30', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S30Y5', nombre: 'LECAP May 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-05-30',
    pagos: [{ fecha: '2025-05-30', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S18J5', nombre: 'LECAP Jun 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-06-18',
    pagos: [{ fecha: '2025-06-18', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S31L5', nombre: 'LECAP Jul 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-07-31',
    pagos: [{ fecha: '2025-07-31', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S29G5', nombre: 'LECAP Ago 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-08-29',
    pagos: [{ fecha: '2025-08-29', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S30S5', nombre: 'LECAP Sep 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-09-30',
    pagos: [{ fecha: '2025-09-30', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S31O5', nombre: 'LECAP Oct 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-10-31',
    pagos: [{ fecha: '2025-10-31', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S28N5', nombre: 'LECAP Nov 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-11-28',
    pagos: [{ fecha: '2025-11-28', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S31D5', nombre: 'LECAP Dic 2025', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2025-12-31',
    pagos: [{ fecha: '2025-12-31', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S30J6', nombre: 'LECAP Jun 2026', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2026-06-30',
    pagos: [{ fecha: '2026-06-30', tipo: 'vencimiento', pct: 100 }],
  },
  {
    ticker: 'S31D6', nombre: 'LECAP Dic 2026', tipo: 'letra', moneda: 'ARS',
    vencimiento: '2026-12-31',
    pagos: [{ fecha: '2026-12-31', tipo: 'vencimiento', pct: 100 }],
  },

  // ── BONOS CER (ARS ajustado por CER) ──
  {
    ticker: 'TX26', nombre: 'Boncer 2026', tipo: 'bono_ars', moneda: 'ARS',
    vencimiento: '2026-08-09', tasa_cupon: 2.5,
    descripcion: 'Capital ajustado por CER + 2.5% anual',
    pagos: [
      { fecha: '2024-08-09', tipo: 'cupon', pct: 1.25 },
      { fecha: '2025-02-09', tipo: 'cupon', pct: 1.25 },
      { fecha: '2025-08-09', tipo: 'cupon', pct: 1.25 },
      { fecha: '2026-02-09', tipo: 'cupon', pct: 1.25 },
      { fecha: '2026-08-09', tipo: 'cupon', pct: 1.25 },
      { fecha: '2026-08-09', tipo: 'amortizacion', pct: 100 },
    ],
  },
  {
    ticker: 'TX28', nombre: 'Boncer 2028', tipo: 'bono_ars', moneda: 'ARS',
    vencimiento: '2028-10-06', tasa_cupon: 2.0,
    descripcion: 'Capital ajustado por CER + 2.0% anual',
    pagos: [
      { fecha: '2025-04-06', tipo: 'cupon', pct: 1.0 },
      { fecha: '2025-10-06', tipo: 'cupon', pct: 1.0 },
      { fecha: '2026-04-06', tipo: 'cupon', pct: 1.0 },
      { fecha: '2026-10-06', tipo: 'cupon', pct: 1.0 },
      { fecha: '2027-04-06', tipo: 'cupon', pct: 1.0 },
      { fecha: '2027-10-06', tipo: 'cupon', pct: 1.0 },
      { fecha: '2028-04-06', tipo: 'cupon', pct: 1.0 },
      { fecha: '2028-10-06', tipo: 'cupon', pct: 1.0 },
      { fecha: '2028-10-06', tipo: 'amortizacion', pct: 100 },
    ],
  },
  {
    ticker: 'TZXD5', nombre: 'Bono Dollar-Linked Dic 2025', tipo: 'bono_ars', moneda: 'ARS',
    vencimiento: '2025-12-31', tasa_cupon: 0,
    descripcion: 'Capital ajustado por tipo de cambio oficial',
    pagos: [
      { fecha: '2025-12-31', tipo: 'amortizacion', pct: 100 },
    ],
  },

  // ── BONOS SOBERANOS USD (AL) ──
  {
    ticker: 'AL29', nombre: 'Bonar 2029', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2029-07-09', tasa_cupon: 1.0,
    descripcion: 'Bono soberano USD Ley Argentina',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2025-07-09', tipo: 'amortizacion', pct: 4 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2026-07-09', tipo: 'amortizacion', pct: 8 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2027-07-09', tipo: 'amortizacion', pct: 13 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2028-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2029-07-09', tipo: 'amortizacion', pct: 50 },
    ],
  },
  {
    ticker: 'AL30', nombre: 'Bonar 2030', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2030-07-09', tasa_cupon: 0.5,
    descripcion: 'Bono soberano USD Ley Argentina',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2027-07-09', tipo: 'amortizacion', pct: 4 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2028-07-09', tipo: 'amortizacion', pct: 8 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2029-07-09', tipo: 'amortizacion', pct: 13 },
      { fecha: '2030-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2030-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2030-07-09', tipo: 'amortizacion', pct: 75 },
    ],
  },
  {
    ticker: 'AL35', nombre: 'Bonar 2035', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2035-07-09', tasa_cupon: 3.625,
    descripcion: 'Bono soberano USD Ley Argentina',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2030-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2030-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2030-07-09', tipo: 'amortizacion', pct: 4 },
      { fecha: '2031-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2031-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2031-07-09', tipo: 'amortizacion', pct: 8 },
      { fecha: '2032-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2032-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2032-07-09', tipo: 'amortizacion', pct: 13 },
      { fecha: '2033-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2033-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2033-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2034-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2034-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2034-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2035-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2035-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2035-07-09', tipo: 'amortizacion', pct: 25 },
    ],
  },

  // ── BONOS SOBERANOS USD (GD - Ley Nueva York) ──
  {
    ticker: 'GD29', nombre: 'Global 2029', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2029-07-09', tasa_cupon: 1.0,
    descripcion: 'Bono soberano USD Ley Nueva York',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2025-07-09', tipo: 'amortizacion', pct: 4 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2026-07-09', tipo: 'amortizacion', pct: 8 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2027-07-09', tipo: 'amortizacion', pct: 13 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2028-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 0.5 },
      { fecha: '2029-07-09', tipo: 'amortizacion', pct: 50 },
    ],
  },
  {
    ticker: 'GD30', nombre: 'Global 2030', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2030-07-09', tasa_cupon: 0.5,
    descripcion: 'Bono soberano USD Ley Nueva York',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2027-07-09', tipo: 'amortizacion', pct: 4 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2028-07-09', tipo: 'amortizacion', pct: 8 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2029-07-09', tipo: 'amortizacion', pct: 13 },
      { fecha: '2030-01-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2030-07-09', tipo: 'cupon', pct: 0.25 },
      { fecha: '2030-07-09', tipo: 'amortizacion', pct: 75 },
    ],
  },
  {
    ticker: 'GD35', nombre: 'Global 2035', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2035-07-09', tasa_cupon: 3.625,
    descripcion: 'Bono soberano USD Ley Nueva York',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2030-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2030-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2030-07-09', tipo: 'amortizacion', pct: 4 },
      { fecha: '2031-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2031-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2031-07-09', tipo: 'amortizacion', pct: 8 },
      { fecha: '2032-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2032-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2032-07-09', tipo: 'amortizacion', pct: 13 },
      { fecha: '2033-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2033-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2033-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2034-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2034-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2034-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2035-01-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2035-07-09', tipo: 'cupon', pct: 1.8125 },
      { fecha: '2035-07-09', tipo: 'amortizacion', pct: 25 },
    ],
  },
  {
    ticker: 'GD38', nombre: 'Global 2038', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2038-01-09', tasa_cupon: 3.875,
    descripcion: 'Bono soberano USD Ley Nueva York',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2030-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2030-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2031-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2031-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2032-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2032-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2033-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2033-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2033-07-09', tipo: 'amortizacion', pct: 5 },
      { fecha: '2034-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2034-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2034-07-09', tipo: 'amortizacion', pct: 10 },
      { fecha: '2035-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2035-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2035-07-09', tipo: 'amortizacion', pct: 15 },
      { fecha: '2036-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2036-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2036-07-09', tipo: 'amortizacion', pct: 20 },
      { fecha: '2037-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2037-07-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2037-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2038-01-09', tipo: 'cupon', pct: 1.9375 },
      { fecha: '2038-01-09', tipo: 'amortizacion', pct: 25 },
    ],
  },
  {
    ticker: 'GD41', nombre: 'Global 2041', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2041-07-09', tasa_cupon: 4.125,
    descripcion: 'Bono soberano USD Ley Nueva York',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2030-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2030-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2031-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2031-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2032-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2032-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2033-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2033-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2034-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2034-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2035-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2035-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2036-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2036-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2036-07-09', tipo: 'amortizacion', pct: 10 },
      { fecha: '2037-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2037-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2037-07-09', tipo: 'amortizacion', pct: 20 },
      { fecha: '2038-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2038-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2038-07-09', tipo: 'amortizacion', pct: 20 },
      { fecha: '2039-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2039-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2039-07-09', tipo: 'amortizacion', pct: 20 },
      { fecha: '2040-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2040-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2040-07-09', tipo: 'amortizacion', pct: 15 },
      { fecha: '2041-01-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2041-07-09', tipo: 'cupon', pct: 2.0625 },
      { fecha: '2041-07-09', tipo: 'amortizacion', pct: 15 },
    ],
  },
  {
    ticker: 'GD46', nombre: 'Global 2046', tipo: 'bono_usd', moneda: 'USD',
    vencimiento: '2046-07-09', tasa_cupon: 4.625,
    descripcion: 'Bono soberano USD Ley Nueva York',
    pagos: [
      { fecha: '2025-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2025-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2026-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2026-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2027-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2027-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2028-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2028-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2029-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2029-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2030-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2030-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2031-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2031-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2032-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2032-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2033-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2033-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2034-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2034-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2035-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2035-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2036-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2036-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2037-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2037-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2038-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2038-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2039-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2039-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2040-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2040-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2041-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2041-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2041-07-09', tipo: 'amortizacion', pct: 4 },
      { fecha: '2042-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2042-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2042-07-09', tipo: 'amortizacion', pct: 8 },
      { fecha: '2043-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2043-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2043-07-09', tipo: 'amortizacion', pct: 13 },
      { fecha: '2044-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2044-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2044-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2045-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2045-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2045-07-09', tipo: 'amortizacion', pct: 25 },
      { fecha: '2046-01-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2046-07-09', tipo: 'cupon', pct: 2.3125 },
      { fecha: '2046-07-09', tipo: 'amortizacion', pct: 25 },
    ],
  },
];

export function getInstrumento(ticker: string): InstrumentoRentaFija | undefined {
  return INSTRUMENTOS_RENTA_FIJA.find(i => i.ticker === ticker);
}

export function esBonoOLetra(categoria: string): boolean {
  return ['bono', 'letra', 'bono_ars', 'bono_usd', 'on'].includes(categoria);
}

export function getPagosFuturos(ticker: string, cantidad: number, precioCompra: number): {
  fecha: string;
  tipo: string;
  monto: number;
  moneda: string;
  diasRestantes: number;
}[] {
  const instrumento = getInstrumento(ticker);
  if (!instrumento) return [];

  const hoy = new Date();
  const valorNominal = cantidad * precioCompra;

  return instrumento.pagos
    .filter(p => new Date(p.fecha) >= hoy)
    .map(p => {
      const fecha = new Date(p.fecha);
      const diasRestantes = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      return {
        fecha: p.fecha,
        tipo: p.tipo,
        monto: (valorNominal * p.pct) / 100,
        moneda: instrumento.moneda,
        diasRestantes,
      };
    })
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

export function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function labelTipoPago(tipo: string): string {
  if (tipo === 'cupon') return 'Cupón';
  if (tipo === 'amortizacion') return 'Amortización';
  return 'Vencimiento';
}