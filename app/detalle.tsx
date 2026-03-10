import { esBonoOLetra, formatFecha, getInstrumento, getPagosFuturos, labelTipoPago } from '@/lib/renta-fija';
import { useTheme } from '@/lib/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Line, Path, Svg, Text as SvgText } from 'react-native-svg';

const PERIODOS = [
  { label: '1D', range: '1d', interval: '5m' },
  { label: '1S', range: '5d', interval: '1h' },
  { label: '1M', range: '1mo', interval: '1d' },
  { label: '3M', range: '3mo', interval: '1d' },
  { label: '6M', range: '6mo', interval: '1wk' },
  { label: '1A', range: '1y', interval: '1wk' },
];

const WIDTH = Dimensions.get('window').width - 40;
const SVG_H = 250;
const PAD = { top: 10, right: 10, bottom: 30, left: 58 };
const CHART_W = WIDTH - PAD.left - PAD.right;
const CHART_H = SVG_H - PAD.top - PAD.bottom;

function GraficoConEjes({
  datos, timestamps, color, formatY
}: {
  datos: { x: number; y: number }[];
  timestamps: number[];
  color: string;
  formatY: (v: number) => string;
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

  const yLabels = [0, 1, 2, 3].map(i => ({
    val: minY + (rangoY * i) / 3,
    py: PAD.top + CHART_H - (i / 3) * CHART_H,
  }));

  const xLabels = [0, 1, 2, 3].map(i => {
    const idx = Math.round((i / 3) * (datos.length - 1));
    const ts = timestamps[idx];
    const date = ts ? new Date(ts * 1000) : null;
    const label = date
      ? date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '')
      : '';
    return { label, px: PAD.left + (idx / rangoX) * CHART_W };
  });

  return (
    <Svg width={WIDTH} height={SVG_H}>
      {yLabels.map((yl, i) => (
        <Line key={`gl${i}`}
          x1={PAD.left} y1={yl.py}
          x2={PAD.left + CHART_W} y2={yl.py}
          stroke="#33333388" strokeWidth={0.5} strokeDasharray="4,4"
        />
      ))}
      <Path d={area} fill={color} fillOpacity={0.08} />
      <Path d={linea} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {yLabels.map((yl, i) => (
        <SvgText key={`yl${i}`}
          x={PAD.left - 4} y={yl.py + 4}
          fontSize={9} fill="#888" textAnchor="end">
          {formatY(yl.val)}
        </SvgText>
      ))}
      {xLabels.map((xl, i) => (
        <SvgText key={`xl${i}`}
          x={xl.px} y={SVG_H - 6}
          fontSize={9} fill="#888" textAnchor="middle">
          {xl.label}
        </SvgText>
      ))}
    </Svg>
  );
}

export default function Detalle() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { ticker, nombre, precioActual, gpPct, categoria, cantidad, precioCompra } = useLocalSearchParams<{
    ticker: string; nombre: string; precioActual: string; gpPct: string;
    categoria: string; cantidad: string; precioCompra: string;
  }>();

  const esRentaFija = esBonoOLetra(categoria ?? '');
  const instrumento = esRentaFija ? getInstrumento(ticker ?? '') : null;
  const pagosFuturos = esRentaFija
    ? getPagosFuturos(ticker ?? '', parseFloat(cantidad ?? '1'), parseFloat(precioCompra ?? '0'))
    : [];

  const [periodo, setPeriodo] = useState(PERIODOS[2]);
  const [datos, setDatos] = useState<{ x: number; y: number }[]>([]);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);
  const [precioInicio, setPrecioInicio] = useState(0);
  const [precioFin, setPrecioFin] = useState(0);

  async function cargarHistorico() {
    setCargando(true);
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${periodo.interval}&range=${periodo.range}`;
      const res = await fetch(url);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const ts = result?.timestamp ?? [];
      const closes = result?.indicators?.quote?.[0]?.close ?? [];

      const combined = ts
        .map((t: number, i: number) => ({ ts: t, y: closes[i] }))
        .filter((p: any) => p.y !== null && p.y !== undefined && !isNaN(p.y));

      const puntos = combined.map((p: any, i: number) => ({ x: i, y: p.y }));
      const tsLimpio = combined.map((p: any) => p.ts);

      setDatos(puntos);
      setTimestamps(tsLimpio);
      if (puntos.length > 0) {
        setPrecioInicio(puntos[0].y);
        setPrecioFin(puntos[puntos.length - 1].y);
      }
    } catch (e) {
      setDatos([]);
      setTimestamps([]);
    }
    setCargando(false);
  }

  useEffect(() => { cargarHistorico(); }, [periodo]);

  const variacion = precioInicio > 0 ? ((precioFin - precioInicio) / precioInicio) * 100 : 0;
  const esPositivo = variacion >= 0;
  const colorLinea = esPositivo ? theme.green : theme.red;

  function formatY(v: number): string {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v.toFixed(0)}`;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBoton}>
          <Text style={styles.backTexto}>‹ Volver</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.ticker}>{ticker}</Text>
        <Text style={styles.nombre}>{nombre}</Text>
        <Text style={styles.precio}>
          $ {parseFloat(precioActual ?? '0').toLocaleString('es-AR', { maximumFractionDigits: 2 })}
        </Text>
        <View style={[styles.variacionBadge, { backgroundColor: esPositivo ? theme.greenDim : theme.redDim }]}>
          <Text style={[styles.variacionTexto, { color: esPositivo ? theme.green : theme.red }]}>
            {esPositivo ? '+' : ''}{variacion.toFixed(2)}% en el período
          </Text>
        </View>
        {gpPct && parseFloat(gpPct) !== 0 && (
          <Text style={[styles.gpTexto, { color: parseFloat(gpPct) >= 0 ? theme.green : theme.red }]}>
            Mi G/P: {parseFloat(gpPct) >= 0 ? '+' : ''}{parseFloat(gpPct).toFixed(2)}%
          </Text>
        )}
      </View>

      <View style={styles.graficoContainer}>
        {cargando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.green} />
            <Text style={styles.loadingTexto}>Cargando datos...</Text>
          </View>
        ) : datos.length < 2 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTexto}>No hay datos disponibles</Text>
          </View>
        ) : (
          <GraficoConEjes
            datos={datos}
            timestamps={timestamps}
            color={colorLinea}
            formatY={formatY}
          />
        )}
      </View>

      <View style={styles.periodosContainer}>
        {PERIODOS.map(p => (
          <TouchableOpacity
            key={p.label}
            style={[styles.periodoBoton, periodo.label === p.label && { backgroundColor: theme.green }]}
            onPress={() => setPeriodo(p)}>
            <Text style={[styles.periodoTexto, periodo.label === p.label && { color: '#000' }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statFila}>
          <Text style={styles.statLabel}>Precio inicio período</Text>
          <Text style={styles.statValor}>$ {precioInicio.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.statFila}>
          <Text style={styles.statLabel}>Precio actual</Text>
          <Text style={styles.statValor}>$ {precioFin.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={[styles.statFila, { borderBottomWidth: 0 }]}>
          <Text style={styles.statLabel}>Variación período</Text>
          <Text style={[styles.statValor, { color: esPositivo ? theme.green : theme.red }]}>
            {esPositivo ? '+' : ''}{variacion.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* FICHA RENTA FIJA */}
      {esRentaFija && instrumento && (
        <View style={styles.rentaFijaContainer}>
          <Text style={styles.seccionTitulo}>📋 Ficha del instrumento</Text>
          <View style={styles.fichaCard}>
            <View style={styles.fichaFila}>
              <Text style={styles.fichaLabel}>Tipo</Text>
              <Text style={styles.fichaValor}>{instrumento.tipo.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <View style={styles.fichaFila}>
              <Text style={styles.fichaLabel}>Moneda</Text>
              <Text style={styles.fichaValor}>{instrumento.moneda}</Text>
            </View>
            <View style={styles.fichaFila}>
              <Text style={styles.fichaLabel}>Vencimiento</Text>
              <Text style={[styles.fichaValor, { color: theme.gold }]}>{formatFecha(instrumento.vencimiento)}</Text>
            </View>
            {instrumento.tasa_cupon !== undefined && instrumento.tasa_cupon > 0 && (
              <View style={styles.fichaFila}>
                <Text style={styles.fichaLabel}>Tasa cupón</Text>
                <Text style={[styles.fichaValor, { color: theme.green }]}>{instrumento.tasa_cupon}% anual</Text>
              </View>
            )}
            {instrumento.descripcion && (
              <View style={[styles.fichaFila, { borderBottomWidth: 0 }]}>
                <Text style={styles.fichaLabel}>Ajuste</Text>
                <Text style={[styles.fichaValor, { flex: 1, textAlign: 'right' }]}>{instrumento.descripcion}</Text>
              </View>
            )}
          </View>

          {pagosFuturos.length > 0 && (
            <>
              <Text style={styles.seccionTitulo}>💰 Flujo de pagos futuros</Text>
              <View style={styles.fichaCard}>
                {pagosFuturos.map((pago, i) => (
                  <View key={i} style={[styles.pagoFila, i === pagosFuturos.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.pagoIcono, {
                      backgroundColor: pago.tipo === 'cupon' ? theme.green + '22'
                        : pago.tipo === 'amortizacion' ? theme.blue + '22'
                        : theme.gold + '22'
                    }]}>
                      <Text style={{ fontSize: 14 }}>
                        {pago.tipo === 'cupon' ? '💰' : pago.tipo === 'amortizacion' ? '🏦' : '✅'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pagoTipo}>{labelTipoPago(pago.tipo)}</Text>
                      <Text style={styles.pagoFecha}>{formatFecha(pago.fecha)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.pagoMonto}>
                        {pago.moneda === 'USD' ? 'u$s' : '$'} {pago.monto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={[styles.pagoDias, {
                        color: pago.diasRestantes <= 7 ? theme.red
                          : pago.diasRestantes <= 30 ? theme.gold
                          : theme.green
                      }]}>
                        en {pago.diasRestantes}d
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}

    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  backBoton: { alignSelf: 'flex-start' },
  backTexto: { color: theme.green, fontSize: 17, fontWeight: '600' },
  infoContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  ticker: { color: theme.white, fontSize: 28, fontWeight: '900' },
  nombre: { color: theme.gray, fontSize: 13, marginTop: 2, marginBottom: 12 },
  precio: { color: theme.white, fontSize: 32, fontWeight: '800' },
  variacionBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  variacionTexto: { fontSize: 13, fontWeight: '700' },
  gpTexto: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  graficoContainer: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingVertical: 8, marginBottom: 8, alignItems: 'center' },
  loadingContainer: { height: 250, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTexto: { color: theme.gray, fontSize: 13 },
  periodosContainer: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 8, marginBottom: 20, backgroundColor: theme.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border },
  periodoBoton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  periodoTexto: { color: theme.gray, fontSize: 12, fontWeight: '700' },
  statsContainer: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20 },
  statFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  statLabel: { color: theme.gray, fontSize: 13 },
  statValor: { color: theme.white, fontSize: 13, fontWeight: '700' },
  rentaFijaContainer: { paddingHorizontal: 20, marginBottom: 30 },
  seccionTitulo: { color: theme.white, fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 8 },
  fichaCard: { backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  fichaFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  fichaLabel: { color: theme.gray, fontSize: 13 },
  fichaValor: { color: theme.white, fontSize: 13, fontWeight: '700' },
  pagoFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  pagoIcono: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pagoTipo: { color: theme.white, fontSize: 13, fontWeight: '600' },
  pagoFecha: { color: theme.gray, fontSize: 11, marginTop: 2 },
  pagoMonto: { color: theme.white, fontSize: 13, fontWeight: '700' },
  pagoDias: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});