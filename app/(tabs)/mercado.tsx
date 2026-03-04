import { ScrollView, StyleSheet, Text, View } from 'react-native';

const indices = [
  { nombre: 'Merval', valor: '2.184.310', cambio: '+2.1%', positivo: true },
  { nombre: 'S&P 500', valor: '5.765', cambio: '+0.8%', positivo: true },
  { nombre: 'Nasdaq', valor: '18.420', cambio: '+1.2%', positivo: true },
  { nombre: 'BTC', valor: '83.4K', cambio: '+2.8%', positivo: true },
];

const cedears = [
  { ticker: 'AAPL', valor: '$ 79.200', cambio: '+1.8%', positivo: true },
  { ticker: 'GOOGL', valor: '$ 163.500', cambio: '-0.4%', positivo: false },
  { ticker: 'MSFT', valor: '$ 108.000', cambio: '+2.1%', positivo: true },
  { ticker: 'NVDA', valor: '$ 131.000', cambio: '+5.2%', positivo: true },
  { ticker: 'AMZN', valor: '$ 182.000', cambio: '-1.1%', positivo: false },
];

const byma = [
  { ticker: 'GGAL', valor: '$ 2.130', cambio: '+3.4%', positivo: true },
  { ticker: 'YPF', valor: '$ 10.800', cambio: '+1.8%', positivo: true },
  { ticker: 'PAMP', valor: '$ 980', cambio: '+2.2%', positivo: true },
  { ticker: 'BMA', valor: '$ 9.100', cambio: '-0.5%', positivo: false },
  { ticker: 'ALUA', valor: '$ 425', cambio: '+4.1%', positivo: true },
];

const crypto = [
  { ticker: 'BTC', valor: 'USD 83.400', cambio: '+2.8%', positivo: true },
  { ticker: 'ETH', valor: 'USD 3.840', cambio: '+1.5%', positivo: true },
  { ticker: 'SOL', valor: 'USD 142', cambio: '-3.2%', positivo: false },
];

function FilaActivo({ ticker, valor, cambio, positivo }: any) {
  return (
    <View style={styles.fila}>
      <View style={styles.filaIcono}>
        <Text style={styles.filaIconoTexto}>{ticker[0]}</Text>
      </View>
      <Text style={styles.filaTicker}>{ticker}</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.filaValor}>{valor}</Text>
      <View style={[styles.filaBadge, { backgroundColor: positivo ? '#00D26A22' : '#FF4D4D22' }]}>
        <Text style={[styles.filaCambio, { color: positivo ? '#00D26A' : '#FF4D4D' }]}>{cambio}</Text>
      </View>
    </View>
  );
}

export default function Mercado() {
  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.titulo}>Mercado 📊</Text>
        <Text style={styles.subtitulo}>CCL <Text style={styles.ccl}>$1.285</Text> · 15:42hs</Text>
      </View>

      {/* ÍNDICES */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.indicesRow}>
        {indices.map((idx) => (
          <View key={idx.nombre} style={styles.indiceCard}>
            <Text style={styles.indiceNombre}>{idx.nombre}</Text>
            <Text style={styles.indiceValor}>{idx.valor}</Text>
            <Text style={[styles.indiceCambio, { color: idx.positivo ? '#00D26A' : '#FF4D4D' }]}>
              {idx.positivo ? '▲' : '▼'} {idx.cambio}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* CEDEARs */}
      <Text style={styles.seccion}>🏷️ CEDEARs destacados</Text>
      <View style={styles.tabla}>
        {cedears.map((a) => <FilaActivo key={a.ticker} {...a} />)}
      </View>

      {/* BYMA */}
      <Text style={styles.seccion}>🇦🇷 Acciones BYMA</Text>
      <View style={styles.tabla}>
        {byma.map((a) => <FilaActivo key={a.ticker} {...a} />)}
      </View>

      {/* CRYPTO */}
      <Text style={styles.seccion}>₿ Crypto</Text>
      <View style={styles.tabla}>
        {crypto.map((a) => <FilaActivo key={a.ticker} {...a} />)}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { color: '#F5F5F5', fontSize: 22, fontWeight: '800' },
  subtitulo: { color: '#555', fontSize: 12 },
  ccl: { color: '#F5C842', fontWeight: '700' },
  indicesRow: { paddingHorizontal: 20, marginBottom: 24 },
  indiceCard: { backgroundColor: '#141414', borderRadius: 12, padding: 14, marginRight: 10, minWidth: 100, borderWidth: 1, borderColor: '#222' },
  indiceNombre: { color: '#555', fontSize: 10, marginBottom: 4 },
  indiceValor: { color: '#F5F5F5', fontSize: 14, fontWeight: '700' },
  indiceCambio: { fontSize: 11, marginTop: 4 },
  seccion: { color: '#F5F5F5', fontSize: 15, fontWeight: '700', paddingHorizontal: 20, marginBottom: 10 },
  tabla: { backgroundColor: '#141414', borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#222' },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', gap: 10 },
  filaIcono: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  filaIconoTexto: { color: '#888', fontWeight: '800', fontSize: 14 },
  filaTicker: { color: '#F5F5F5', fontWeight: '700', fontSize: 14 },
  filaValor: { color: '#F5F5F5', fontSize: 13, marginRight: 8 },
  filaBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  filaCambio: { fontSize: 12, fontWeight: '700' },
});