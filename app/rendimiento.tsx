import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Line, Path, Svg, Text as SvgText } from 'react-native-svg';

const WIDTH = Dimensions.get('window').width - 40;
const SVG_H = 250;
const PAD = { top: 10, right: 10, bottom: 30, left: 58 };
const CHART_W = WIDTH - PAD.left - PAD.right;
const CHART_H = SVG_H - PAD.top - PAD.bottom;

const PERIODOS = [
  { label: '1S',    days: 7,   range: '5d' },
  { label: '1M',    days: 30,  range: '1mo' },
  { label: '3M',    days: 90,  range: '3mo' },
  { label: '6M',    days: 180, range: '6mo' },
  { label: '1A',    days: 365, range: '1y' },
  { label: 'Compra', days: 0,  range: 'compra' },
];

const GRUPOS = [
  { id: 'todo',          label: 'Toda la cartera' },
  { id: 'cedear',        label: 'CEDEARs' },
  { id: 'byma',          label: 'Acciones BYMA' },
  { id: 'nasdaq',        label: 'NYSE / NASDAQ' },
  { id: 'crypto',        label: 'Crypto' },
  { id: 'personalizado', label: 'Personalizado' },
];

type Posicion = {
  id: string;
  ticker: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  precio_compra: number;
  moneda: string;
  fecha_compra: string;
};

type Punto = { x: number; y: number };

function GraficoConEjes({ datos, timestamps, color, formatY }: {
  datos: Punto[]; timestamps: number[]; color: string; formatY: (v: number) => string;
}) {
  if (datos.length < 2) return null;
  const minY = Math.min(...datos.map(d => d.y));
  const maxY = Math.max(...datos.map(d => d.y));
  const rangoY = maxY - minY || 1;
  const rangoX = datos.length - 1;
  const puntos = datos.map((d, i) => {
    const px = PAD.left + (i / rangoX) * CHART_W;
    const py = PAD.top + CHART_H - ((d.y - minY) / rangoY) * CHART_H;
    return { px, py, str: `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}` };
  });
  const linea = puntos.map(p => p.str).join(' ');
  const first = puntos[0];
  const last = puntos[puntos.length - 1];
  const area = `${linea} L${last.px.toFixed(2)},${(PAD.top + CHART_H).toFixed(2)} L${first.px.toFixed(2)},${(PAD.top + CHART_H).toFixed(2)} Z`;
  const yLabels = [0, 1, 2, 3].map(i => ({ val: minY + (rangoY * i) / 3, py: PAD.top + CHART_H - (i / 3) * CHART_H }));
  const xLabels = [0, 1, 2, 3].map(i => {
    const idx = Math.round((i / 3) * (datos.length - 1));
    const ts = timestamps[idx];
    const date = ts ? new Date(ts * 1000) : null;
    const label = date ? date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '') : '';
    return { label, px: PAD.left + (idx / rangoX) * CHART_W };
  });
  return (
    <Svg width={WIDTH} height={SVG_H}>
      {yLabels.map((yl, i) => (
        <Line key={`gl${i}`} x1={PAD.left} y1={yl.py} x2={PAD.left + CHART_W} y2={yl.py} stroke="#33333388" strokeWidth={0.5} strokeDasharray="4,4" />
      ))}
      <Path d={area} fill={color} fillOpacity={0.08} />
      <Path d={linea} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {yLabels.map((yl, i) => (
        <SvgText key={`yl${i}`} x={PAD.left - 4} y={yl.py + 4} fontSize={9} fill="#888" textAnchor="end">{formatY(yl.val)}</SvgText>
      ))}
      {xLabels.map((xl, i) => (
        <SvgText key={`xl${i}`} x={xl.px} y={SVG_H - 6} fontSize={9} fill="#888" textAnchor="middle">{xl.label}</SvgText>
      ))}
    </Svg>
  );
}

function GraficoBenchmark({ cartera, sp500, inflacion, timestamps, colorCartera }: {
  cartera: Punto[]; sp500: Punto[]; inflacion: Punto[]; timestamps: number[]; colorCartera: string;
}) {
  if (cartera.length < 2) return null;
  const todasY = [...cartera.map(d => d.y), ...sp500.map(d => d.y), ...inflacion.map(d => d.y)];
  const minY = Math.min(...todasY);
  const maxY = Math.max(...todasY);
  const rangoY = maxY - minY || 1;
  const rangoX = cartera.length - 1;
  const toPath = (puntos: Punto[]) =>
    puntos.map((d, i) => {
      const px = PAD.left + (i / rangoX) * CHART_W;
      const py = PAD.top + CHART_H - ((d.y - minY) / rangoY) * CHART_H;
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
    }).join(' ');
  const yLabels = [0, 1, 2, 3].map(i => ({ val: minY + (rangoY * i) / 3, py: PAD.top + CHART_H - (i / 3) * CHART_H }));
  const xLabels = [0, 1, 2, 3].map(i => {
    const idx = Math.round((i / 3) * (cartera.length - 1));
    const ts = timestamps[idx];
    const date = ts ? new Date(ts * 1000) : null;
    const label = date ? date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '') : '';
    return { label, px: PAD.left + (idx / rangoX) * CHART_W };
  });
  return (
    <Svg width={WIDTH} height={SVG_H}>
      {yLabels.map((yl, i) => (
        <Line key={`gl${i}`} x1={PAD.left} y1={yl.py} x2={PAD.left + CHART_W} y2={yl.py} stroke="#33333388" strokeWidth={0.5} strokeDasharray="4,4" />
      ))}
      {inflacion.length >= 2 && <Path d={toPath(inflacion)} stroke="#FF9D4D" strokeWidth={1.5} fill="none" strokeDasharray="5,3" strokeLinejoin="round" />}
      {sp500.length >= 2 && <Path d={toPath(sp500)} stroke="#A855F7" strokeWidth={1.5} fill="none" strokeLinejoin="round" />}
      <Path d={toPath(cartera)} stroke={colorCartera} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {yLabels.map((yl, i) => (
        <SvgText key={`yl${i}`} x={PAD.left - 4} y={yl.py + 4} fontSize={9} fill="#888" textAnchor="end">{`${yl.val >= 0 ? '+' : ''}${yl.val.toFixed(1)}%`}</SvgText>
      ))}
      {xLabels.map((xl, i) => (
        <SvgText key={`xl${i}`} x={xl.px} y={SVG_H - 6} fontSize={9} fill="#888" textAnchor="middle">{xl.label}</SvgText>
      ))}
    </Svg>
  );
}

export default function Rendimiento() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme);

  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoGrafico, setCargandoGrafico] = useState(false);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('todo');
  const [activosPersonalizados, setActivosPersonalizados] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState(PERIODOS[1]);
  const [modoGrafico, setModoGrafico] = useState<'pesos' | 'porcentaje'>('pesos');
  const [datosPesos, setDatosPesos] = useState<Punto[]>([]);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [valorInicio, setValorInicio] = useState(0);
  const [valorFin, setValorFin] = useState(0);

  const [sp500Pct, setSp500Pct] = useState<Punto[]>([]);
  const [inflacionPct, setInflacionPct] = useState<Punto[]>([]);
  const [sp500Total, setSp500Total] = useState<number | null>(null);
  const [inflacionTotal, setInflacionTotal] = useState<number | null>(null);
  const [cargandoBenchmark, setCargandoBenchmark] = useState(false);

  useEffect(() => { cargarPosiciones(); }, []);
  useEffect(() => { if (posiciones.length > 0) cargarGrafico(); }, [posiciones, grupoSeleccionado, activosPersonalizados, periodo]);
  useEffect(() => { cargarBenchmark(); }, [periodo]);

  async function cargarPosiciones() {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('posiciones').select('*').eq('usuario_id', user.id);
    if (data) setPosiciones(data);
    setCargando(false);
  }

  function getActivosFiltrados(): Posicion[] {
    if (grupoSeleccionado === 'todo') return posiciones;
    if (grupoSeleccionado === 'personalizado') return posiciones.filter(p => activosPersonalizados.includes(p.ticker));
    return posiciones.filter(p => p.categoria === grupoSeleccionado);
  }

  async function cargarBenchmark() {
    setCargandoBenchmark(true);
    try {
      const urlSP = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=${periodo.range === 'compra' ? '1y' : periodo.range}`;
      const resSP = await fetch(urlSP);
      const jsonSP = await resSP.json();
      const resultSP = jsonSP?.chart?.result?.[0];
      const closesSP: number[] = resultSP?.indicators?.quote?.[0]?.close ?? [];
      const validSP = closesSP.filter((v: number) => v !== null && !isNaN(v));
      if (validSP.length >= 2) {
        const base = validSP[0];
        setSp500Pct(validSP.map((v: number, i: number) => ({ x: i, y: ((v - base) / base) * 100 })));
        setSp500Total(((validSP[validSP.length - 1] - base) / base) * 100);
      } else {
        setSp500Pct([]); setSp500Total(null);
      }
      const resIPC = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion');
      const dataIPC = await resIPC.json();
      if (Array.isArray(dataIPC) && dataIPC.length > 0) {
        const meses = periodo.days <= 7 ? 1 : periodo.days <= 30 ? 1 : periodo.days <= 90 ? 3 : periodo.days <= 180 ? 6 : 12;
        const ultimos = dataIPC.slice(-meses);
        let acumulado = 0;
        const puntosIPC: Punto[] = [{ x: 0, y: 0 }];
        ultimos.forEach((item: { valor: number }, i: number) => {
          acumulado = (1 + acumulado / 100) * (1 + item.valor / 100) * 100 - 100;
          puntosIPC.push({ x: i + 1, y: acumulado });
        });
        const total = validSP.length || 30;
        const expanded: Punto[] = [];
        for (let i = 0; i < total; i++) {
          const idx = Math.min(Math.floor((i / (total - 1)) * (puntosIPC.length - 1)), puntosIPC.length - 1);
          expanded.push({ x: i, y: puntosIPC[idx].y });
        }
        setInflacionPct(expanded);
        setInflacionTotal(puntosIPC[puntosIPC.length - 1].y);
      }
    } catch (e) {
      setSp500Pct([]); setSp500Total(null); setInflacionPct([]); setInflacionTotal(null);
    }
    setCargandoBenchmark(false);
  }

  async function cargarGrafico() {
    const activos = getActivosFiltrados();
    if (activos.length === 0) { setDatosPesos([]); setTimestamps([]); return; }
    setCargandoGrafico(true);

    try {
      let period1: number | null = null;
      if (periodo.range === 'compra') {
        const fechas = activos
          .map(p => p.fecha_compra)
          .filter(Boolean)
          .map(f => Math.floor(new Date(f).getTime() / 1000));
        if (fechas.length > 0) period1 = Math.min(...fechas);
      }

      const promesas = activos.map(async (pos) => {
        const yfinanceTicker = pos.categoria === 'crypto'
          ? getCryptoYFTicker(pos.ticker)
          : pos.categoria === 'byma'
            ? `${pos.ticker}.BA`
            : pos.ticker;

        let url: string;
        if (period1) {
          const period2 = Math.floor(Date.now() / 1000);
          url = `https://query1.finance.yahoo.com/v8/finance/chart/${yfinanceTicker}?interval=1d&period1=${period1}&period2=${period2}`;
        } else {
          url = `https://query1.finance.yahoo.com/v8/finance/chart/${yfinanceTicker}?interval=1d&range=${periodo.range}`;
        }

        const res = await fetch(url);
        const json = await res.json();
        const result = json?.chart?.result?.[0];
        return {
          pos,
          timestamps: result?.timestamp ?? [],
          closes: result?.indicators?.quote?.[0]?.close ?? [],
        };
      });

      const resultados = await Promise.all(promesas);
      // Solo incluir activos con datos de Yahoo (ignorar bonos/letras sin datos)
      const validos = resultados.filter(r => r.timestamps.length > 1 && r.closes.some((c: any) => c !== null && !isNaN(c)));
      if (validos.length === 0) { setDatosPesos([]); setTimestamps([]); setCargandoGrafico(false); return; }

      const minLen = Math.min(...validos.map(r => r.timestamps.length));
      const tsComunes = validos[0].timestamps.slice(0, minLen);

      const puntos: Punto[] = [];
      for (let i = 0; i < minLen; i++) {
        let valorTotal = 0;
        for (const { pos, closes } of validos) {
          const precio = closes[i];
          if (precio !== null && precio !== undefined && !isNaN(precio)) {
            valorTotal += pos.cantidad * precio;
          }
        }
        puntos.push({ x: i, y: valorTotal });
      }

      setDatosPesos(puntos);
      setTimestamps(tsComunes);
      if (puntos.length > 0) {
        setValorInicio(puntos[0].y);
        setValorFin(puntos[puntos.length - 1].y);
      }
    } catch (e) {
      setDatosPesos([]); setTimestamps([]);
    }
    setCargandoGrafico(false);
  }

  function getCryptoYFTicker(ticker: string): string {
    const mapa: Record<string, string> = { 'BTC': 'BTC-USD', 'ETH': 'ETH-USD', 'SOL': 'SOL-USD', 'ADA': 'ADA-USD', 'USDT': 'USDT-USD' };
    return mapa[ticker] ?? `${ticker}-USD`;
  }

  const variacion = valorInicio > 0 ? ((valorFin - valorInicio) / valorInicio) * 100 : 0;
  const esPositivo = variacion >= 0;
  const colorLinea = esPositivo ? theme.green : theme.red;
  const activosFiltrados = getActivosFiltrados();

  const datosPct: Punto[] = valorInicio > 0
    ? datosPesos.map(d => ({ x: d.x, y: ((d.y - valorInicio) / valorInicio) * 100 }))
    : [];

  const datosGrafico: Punto[] = modoGrafico === 'pesos' ? datosPesos : datosPct;

  function formatYPesos(v: number): string {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v.toFixed(0)}`;
  }
  function formatYPct(v: number): string { return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`; }

  function togglePersonalizado(ticker: string) {
    setActivosPersonalizados(prev => prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]);
  }

  const benchmarks = [
    { label: 'Tu cartera',    valor: variacion,      color: colorLinea,  icono: '💼' },
    { label: 'S&P 500',       valor: sp500Total,      color: '#A855F7',   icono: '🇺🇸' },
    { label: 'Inflación IPC', valor: inflacionTotal,  color: '#FF9D4D',   icono: '📊' },
  ];

  return (
    <ScrollView style={styles.container}>

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBoton}>
          <Text style={styles.backTexto}>‹ Volver</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.titulo}>Rendimiento 📈</Text>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      ) : (
        <>
          <View style={styles.valorContainer}>
            <Text style={styles.valorTotal}>
              $ {valorFin.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </Text>
            <View style={[styles.variacionBadge, { backgroundColor: esPositivo ? theme.greenDim : theme.redDim }]}>
              <Text style={[styles.variacionTexto, { color: esPositivo ? theme.green : theme.red }]}>
                {esPositivo ? '+' : ''}{variacion.toFixed(2)}% en el período
              </Text>
            </View>
          </View>

          {/* MODO $ / % */}
          <View style={styles.modoRow}>
            {(['pesos', 'porcentaje'] as const).map(m => (
              <TouchableOpacity key={m}
                style={[styles.modoBoton, modoGrafico === m && { backgroundColor: theme.green }]}
                onPress={() => setModoGrafico(m)}>
                <Text style={[styles.modoTexto, modoGrafico === m && { color: '#000' }]}>
                  {m === 'pesos' ? '$ Valor' : '% Rendimiento'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* GRAFICO */}
          <View style={styles.graficoContainer}>
            {cargandoGrafico ? (
              <View style={styles.loadingGrafico}>
                <ActivityIndicator size="large" color={theme.green} />
                <Text style={styles.loadingTexto}>Calculando rendimiento...</Text>
              </View>
            ) : datosGrafico.length < 2 ? (
              <View style={styles.loadingGrafico}>
                <Text style={styles.loadingTexto}>
                  {activosFiltrados.length === 0 ? 'Sin activos en esta categoría' : 'No hay datos suficientes para este período'}
                </Text>
              </View>
            ) : modoGrafico === 'porcentaje' && (sp500Pct.length >= 2 || inflacionPct.length >= 2) ? (
              <GraficoBenchmark
                cartera={datosPct}
                sp500={sp500Pct}
                inflacion={inflacionPct}
                timestamps={timestamps}
                colorCartera={colorLinea}
              />
            ) : (
              <GraficoConEjes
                datos={datosGrafico}
                timestamps={timestamps}
                color={colorLinea}
                formatY={modoGrafico === 'pesos' ? formatYPesos : formatYPct}
              />
            )}
            {modoGrafico === 'porcentaje' && (
              <View style={styles.leyendaRow}>
                <View style={styles.leyendaItem}>
                  <View style={[styles.leyendaDot, { backgroundColor: colorLinea }]} />
                  <Text style={styles.leyendaTexto}>Cartera</Text>
                </View>
                <View style={styles.leyendaItem}>
                  <View style={[styles.leyendaDot, { backgroundColor: '#A855F7' }]} />
                  <Text style={styles.leyendaTexto}>S&P 500</Text>
                </View>
                <View style={styles.leyendaItem}>
                  <View style={[styles.leyendaDash, { backgroundColor: '#FF9D4D' }]} />
                  <Text style={styles.leyendaTexto}>IPC ARG</Text>
                </View>
              </View>
            )}
          </View>

          {/* PERIODOS */}
          <View style={styles.periodosContainer}>
            {PERIODOS.map(p => (
              <TouchableOpacity key={p.label}
                style={[styles.periodoBoton, periodo.label === p.label && { backgroundColor: theme.green }]}
                onPress={() => setPeriodo(p)}>
                <Text style={[styles.periodoTexto, periodo.label === p.label && { color: '#000' }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* BENCHMARKING */}
          <Text style={styles.seccionTitulo}>Benchmarking · {periodo.label}</Text>
          <View style={styles.benchmarkContainer}>
            {cargandoBenchmark ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={theme.green} />
              </View>
            ) : (
              benchmarks.map((b, i) => {
                const esPos = (b.valor ?? 0) >= 0;
                const color = b.valor === null ? theme.gray : esPos ? theme.green : theme.red;
                const bg = b.valor === null ? theme.card2 : esPos ? theme.greenDim : theme.redDim;
                return (
                  <View key={i} style={[styles.benchmarkFila, i === benchmarks.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.benchmarkIcono}>{b.icono}</Text>
                    <Text style={styles.benchmarkLabel}>{b.label}</Text>
                    {b.valor === null ? (
                      <Text style={[styles.benchmarkValor, { color: theme.gray }]}>—</Text>
                    ) : (
                      <View style={[styles.benchmarkBadge, { backgroundColor: bg }]}>
                        <Text style={[styles.benchmarkValor, { color }]}>
                          {esPos ? '+' : ''}{b.valor.toFixed(2)}%
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
          <Text style={styles.notaBenchmark}>
            * S&P 500 en USD · IPC acumulado estimado por período · Cartera calculada en precio de mercado
          </Text>

          {/* GRUPOS */}
          <Text style={styles.seccionTitulo}>Filtrar por grupo</Text>
          <View style={styles.gruposContainer}>
            {GRUPOS.map(g => (
              <TouchableOpacity key={g.id}
                style={[styles.grupoBoton, grupoSeleccionado === g.id && { backgroundColor: theme.green, borderColor: theme.green }]}
                onPress={() => setGrupoSeleccionado(g.id)}>
                <Text style={[styles.grupoTexto, grupoSeleccionado === g.id && { color: '#000' }]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* SELECTOR PERSONALIZADO */}
          {grupoSeleccionado === 'personalizado' && (
            <>
              <Text style={styles.seccionTitulo}>Seleccioná los activos</Text>
              <View style={styles.tabla}>
                {posiciones.map((pos, i) => (
                  <TouchableOpacity key={pos.id}
                    style={[styles.filaActivo, i === posiciones.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => togglePersonalizado(pos.ticker)}>
                    <View style={[styles.checkbox, activosPersonalizados.includes(pos.ticker) && { backgroundColor: theme.green, borderColor: theme.green }]}>
                      {activosPersonalizados.includes(pos.ticker) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.filaTickerTexto}>{pos.ticker}</Text>
                    <Text style={styles.filaNombreTexto}>{pos.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* STATS */}
          <View style={styles.statsContainer}>
            <View style={styles.statFila}>
              <Text style={styles.statLabel}>Valor inicio período</Text>
              <Text style={styles.statValor}>$ {valorInicio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.statFila}>
              <Text style={styles.statLabel}>Valor actual</Text>
              <Text style={styles.statValor}>$ {valorFin.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.statFila}>
              <Text style={styles.statLabel}>Variación</Text>
              <Text style={[styles.statValor, { color: esPositivo ? theme.green : theme.red }]}>
                {esPositivo ? '+' : ''}{variacion.toFixed(2)}%
              </Text>
            </View>
            <View style={[styles.statFila, { borderBottomWidth: 0 }]}>
              <Text style={styles.statLabel}>Activos incluidos</Text>
              <Text style={styles.statValor}>{activosFiltrados.length}</Text>
            </View>
          </View>

        </>
      )}
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  backBoton: { alignSelf: 'flex-start' },
  backTexto: { color: theme.green, fontSize: 17, fontWeight: '600' },
  titulo: { color: theme.white, fontSize: 24, fontWeight: '900', paddingHorizontal: 20, marginBottom: 16 },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  valorContainer: { alignItems: 'center', paddingBottom: 16 },
  valorTotal: { color: theme.white, fontSize: 32, fontWeight: '800' },
  variacionBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  variacionTexto: { fontSize: 13, fontWeight: '700' },
  modoRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: theme.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border },
  modoBoton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  modoTexto: { color: theme.gray, fontSize: 13, fontWeight: '700' },
  graficoContainer: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingVertical: 16, marginBottom: 8, alignItems: 'center' },
  loadingGrafico: { height: 250, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTexto: { color: theme.gray, fontSize: 13 },
  leyendaRow: { flexDirection: 'row', gap: 16, marginTop: 8, paddingHorizontal: 16 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaDot: { width: 10, height: 10, borderRadius: 5 },
  leyendaDash: { width: 16, height: 3, borderRadius: 2 },
  leyendaTexto: { color: theme.gray, fontSize: 11 },
  periodosContainer: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 8, marginBottom: 20, backgroundColor: theme.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border },
  periodoBoton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  periodoTexto: { color: theme.gray, fontSize: 11, fontWeight: '700' },
  seccionTitulo: { color: theme.white, fontSize: 15, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12 },
  benchmarkContainer: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  benchmarkFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 10 },
  benchmarkIcono: { fontSize: 20 },
  benchmarkLabel: { flex: 1, color: theme.white, fontSize: 14, fontWeight: '600' },
  benchmarkBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  benchmarkValor: { fontSize: 14, fontWeight: '800' },
  notaBenchmark: { color: theme.gray, fontSize: 10, paddingHorizontal: 20, marginBottom: 20, lineHeight: 16 },
  gruposContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 20 },
  grupoBoton: { backgroundColor: theme.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.border },
  grupoTexto: { color: theme.lgray, fontSize: 12, fontWeight: '600' },
  tabla: { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  filaActivo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#000', fontSize: 13, fontWeight: '800' },
  filaTickerTexto: { color: theme.white, fontWeight: '700', fontSize: 14 },
  filaNombreTexto: { color: theme.gray, fontSize: 12, flex: 1 },
  statsContainer: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 30 },
  statFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  statLabel: { color: theme.gray, fontSize: 13 },
  statValor: { color: theme.white, fontSize: 13, fontWeight: '700' },
});
