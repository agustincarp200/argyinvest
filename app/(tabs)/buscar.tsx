import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const categorias = [
  { id: 'cedears', label: 'CEDEARs', icon: '🏷️', color: '#F5C842', cantidad: 5 },
  { id: 'byma', label: 'BYMA', icon: '🇦🇷', color: '#4D9EFF', cantidad: 5 },
  { id: 'nasdaq', label: 'NYSE/NASDAQ', icon: '🌎', color: '#A855F7', cantidad: 3 },
  { id: 'fcis', label: 'FCIs', icon: '💰', color: '#22D3EE', cantidad: 3 },
  { id: 'bonos', label: 'Bonos', icon: '📜', color: '#FF9D4D', cantidad: 3 },
  { id: 'crypto', label: 'Crypto', icon: '₿', color: '#F59E0B', cantidad: 3 },
];

const tendencias = [
  { ticker: 'NVDA', valor: '$ 131.000', cambio: '+5.2%', positivo: true },
  { ticker: 'GGAL', valor: '$ 2.130', cambio: '+3.4%', positivo: true },
  { ticker: 'BTC', valor: 'USD 83.400', cambio: '+2.8%', positivo: true },
  { ticker: 'SOL', valor: 'USD 142', cambio: '-3.2%', positivo: false },
  { ticker: 'GOOGL', valor: '$ 163.500', cambio: '-0.4%', positivo: false },
];

export default function Buscar() {
  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.titulo}>Buscar 🔍</Text>
      </View>

      {/* BARRA DE BÚSQUEDA */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcono}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ticker, empresa o fondo..."
          placeholderTextColor="#555"
        />
      </View>

      {/* CATEGORÍAS */}
      <Text style={styles.seccion}>CATEGORÍAS</Text>
      <View style={styles.categoriasGrid}>
        {categorias.map((cat) => (
          <TouchableOpacity key={cat.id} style={[styles.categoriaCard, { borderColor: cat.color + '44' }]}>
            <Text style={styles.categoriaIcono}>{cat.icon}</Text>
            <Text style={[styles.categoriaLabel, { color: cat.color }]}>{cat.label}</Text>
            <Text style={styles.categoriaCantidad}>{cat.cantidad} activos</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TENDENCIAS */}
      <Text style={styles.seccion}>TENDENCIAS HOY</Text>
      <View style={styles.tabla}>
        {tendencias.map((a) => (
          <View key={a.ticker} style={styles.fila}>
            <View style={styles.filaIcono}>
              <Text style={styles.filaIconoTexto}>{a.ticker[0]}</Text>
            </View>
            <Text style={styles.filaTicker}>{a.ticker}</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.filaValor}>{a.valor}</Text>
            <View style={[styles.filaBadge, { backgroundColor: a.positivo ? '#00D26A22' : '#FF4D4D22' }]}>
              <Text style={[styles.filaCambio, { color: a.positivo ? '#00D26A' : '#FF4D4D' }]}>{a.cambio}</Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 20, paddingTop: 60 },
  titulo: { color: '#F5F5F5', fontSize: 22, fontWeight: '800' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 12, marginHorizontal: 20, marginBottom: 24, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#222', gap: 10 },
  searchIcono: { fontSize: 16 },
  searchInput: { flex: 1, color: '#F5F5F5', fontSize: 14 },
  seccion: { color: '#888', fontSize: 11, fontWeight: '600', paddingHorizontal: 20, marginBottom: 12, letterSpacing: 1 },
  categoriasGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  categoriaCard: { width: '47%', backgroundColor: '#141414', borderRadius: 12, padding: 14, borderWidth: 1.5 },
  categoriaIcono: { fontSize: 24, marginBottom: 8 },
  categoriaLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  categoriaCantidad: { color: '#555', fontSize: 11 },
  tabla: { backgroundColor: '#141414', borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#222' },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', gap: 10 },
  filaIcono: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  filaIconoTexto: { color: '#888', fontWeight: '800', fontSize: 14 },
  filaTicker: { color: '#F5F5F5', fontWeight: '700', fontSize: 14 },
  filaValor: { color: '#F5F5F5', fontSize: 13, marginRight: 8 },
  filaBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  filaCambio: { fontSize: 12, fontWeight: '700' },
});