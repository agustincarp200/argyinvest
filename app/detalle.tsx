import { useTheme } from '@/lib/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

const PERIODOS = [
  { label: '1D', range: '1d', interval: '5m' },
  { label: '1S', range: '5d', interval: '1h' },
  { label: '1M', range: '1mo', interval: '1d' },
  { label: '3M', range: '3mo', interval: '1d' },
  { label: '6M', range: '6mo', interval: '1wk' },
  { label: '1A', range: '1y', interval: '1wk' },
];

const WIDTH = Dimensions.get('window').width - 40;
const HEIGHT = 200;

function construirPath(datos: { x: number; y: number }[]): { linea: string; area: string } | null {
  if (datos.length < 2) return null;
  const minY = Math.min(...datos.map(d => d.y));
  const maxY = Math.max(...datos.map(d => d.y));
  const rangoY = maxY - minY || 1;
  const rangoX = datos.length - 1;

  const puntos = datos.map((d, i) => {
    const px = (i / rangoX) * WIDTH;
    const py = HEIGHT - ((d.y - minY) / rangoY) * HEIGHT;
    return `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
  });

  const area = [...puntos, `L${WIDTH},${HEIGHT}`, `L0,${HEIGHT}`, 'Z'].join(' ');

  return { linea: puntos.join(' '), area };
}

export default function Detalle() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { ticker, nombre, precioActual, gpPct } = useLocalSearchParams<{
    ticker: string;
    nombre: string;
    precioActual: string;
    gpPct: string;
  }>();

  const [periodo, setPeriodo] = useState(PERIODOS[2]);
  const [datos, setDatos] = useState<{ x: number; y: number }[]>([]);
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
      const timestamps = result?.timestamp ?? [];
      const closes = result?.indicators?.quote?.[0]?.close ?? [];

      const puntos = timestamps
        .map((t: number, i: number) => ({ x: i, y: closes[i] }))
        .filter((p: any) => p.y !== null && p.y !== undefined && !isNaN(p.y));

      setDatos(puntos);
      if (puntos.length > 0) {
        setPrecioInicio(puntos[0].y);
        setPrecioFin(puntos[puntos.length - 1].y);
      }
    } catch (e) {
      setDatos([]);
    }
    setCargando(false);
  }

  useEffect(() => { cargarHistorico(); }, [periodo]);

  const variacion = precioInicio > 0 ? ((precioFin - precioInicio) / precioInicio) * 100 : 0;
  const esPositivo = variacion >= 0;
  const colorLinea = esPositivo ? theme.green : theme.red;
  const paths = construirPath(datos);

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBoton}>
          <Text style={styles.backTexto}>‹ Volver</Text>
        </TouchableOpacity>
      </View>

      {/* INFO ACTIVO */}
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
        {gpPct && (
          <Text style={[styles.gpTexto, { color: parseFloat(gpPct) >= 0 ? theme.green : theme.red }]}>
            Mi G/P: {parseFloat(gpPct) >= 0 ? '+' : ''}{parseFloat(gpPct).toFixed(2)}%
          </Text>
        )}
      </View>

      {/* GRAFICO */}
      <View style={styles.graficoContainer}>
        {cargando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.green} />
            <Text style={styles.loadingTexto}>Cargando datos...</Text>
          </View>
        ) : !paths ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTexto}>No hay datos disponibles</Text>
          </View>
        ) : (
          <Svg width={WIDTH} height={HEIGHT}>
            <Path
              d={paths.area}
              fill={colorLinea}
              fillOpacity={0.08}
            />
            <Path
              d={paths.linea}
              stroke={colorLinea}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        )}
      </View>

      {/* SELECTOR DE PERIODO */}
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

      {/* STATS */}
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
  graficoContainer: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingVertical: 16, marginBottom: 8, alignItems: 'center' },
  loadingContainer: { height: 200, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTexto: { color: theme.gray, fontSize: 13 },
  periodosContainer: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 8, marginBottom: 20, backgroundColor: theme.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border },
  periodoBoton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  periodoTexto: { color: theme.gray, fontSize: 12, fontWeight: '700' },
  statsContainer: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 30 },
  statFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  statLabel: { color: theme.gray, fontSize: 13 },
  statValor: { color: theme.white, fontSize: 13, fontWeight: '700' },
});