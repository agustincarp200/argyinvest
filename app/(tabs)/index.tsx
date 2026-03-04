import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [enUSD, setEnUSD] = useState(false);

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>Buenos días, Agust 👋</Text>
          <Text style={styles.appNombre}>ArgylnVest</Text>
        </View>
        <TouchableOpacity
          style={styles.botonMoneda}
          onPress={() => setEnUSD(!enUSD)}>
          <Text style={styles.botonMonedaTexto}>
            {enUSD ? '🇺🇸 USD' : '🇦🇷 ARS'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* VALOR TOTAL */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>VALOR TOTAL DE CARTERA</Text>
        <Text style={styles.totalValor}>
          {enUSD ? 'USD 11.533' : '$ 14.823.540'}
        </Text>
        <View style={styles.variacionBadge}>
          <Text style={styles.variacionTexto}>+2.16% (+$ 312.800 hoy)</Text>
        </View>
      </View>

      {/* TARJETAS RESUMEN */}
      <View style={styles.tarjetasRow}>
        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaLabel}>Invertido</Text>
          <Text style={styles.tarjetaValor}>$ 12.200.000</Text>
        </View>
        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaLabel}>CCL</Text>
          <Text style={[styles.tarjetaValor, { color: '#F5C842' }]}>$1.285</Text>
        </View>
        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaLabel}>Activos</Text>
          <Text style={[styles.tarjetaValor, { color: '#4D9EFF' }]}>19</Text>
        </View>
      </View>

      {/* SECCIÓN POSICIONES */}
      <Text style={styles.seccionTitulo}>Mis Posiciones</Text>

      {/* FILTROS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow}>
        {['CEDEARs', 'BYMA', 'NYSE', 'FCIs', 'Bonos', 'Crypto'].map((f) => (
          <TouchableOpacity key={f} style={styles.filtroBoton}>
            <Text style={styles.filtroTexto}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* LISTA DE ACTIVOS */}
      {[
        { ticker: 'GGAL', nombre: 'Gfin. Galicia', valor: '$ 426.000', cambio: '+3.4%', positivo: true },
        { ticker: 'YPF', nombre: 'YPF S.A.', valor: '$ 1.080.000', cambio: '+1.8%', positivo: true },
        { ticker: 'PAMP', nombre: 'Pampa Energía', valor: '$ 294.000', cambio: '+2.2%', positivo: true },
        { ticker: 'BABA', nombre: 'Alibaba Group', valor: '$ 680.000', cambio: '-5.6%', positivo: false },
        { ticker: 'MELI', nombre: 'MercadoLibre', valor: '$ 1.050.000', cambio: '+13.5%', positivo: true },
      ].map((activo) => (
        <View key={activo.ticker} style={styles.activoRow}>
          <View style={styles.activoIcono}>
            <Text style={styles.activoIconoTexto}>{activo.ticker[0]}</Text>
          </View>
          <View style={styles.activoInfo}>
            <Text style={styles.activoTicker}>{activo.ticker}</Text>
            <Text style={styles.activoNombre}>{activo.nombre}</Text>
          </View>
          <View style={styles.activoDerecha}>
            <Text style={styles.activoValor}>{activo.valor}</Text>
            <Text style={[styles.activoCambio, { color: activo.positivo ? '#00D26A' : '#FF4D4D' }]}>
              {activo.cambio}
            </Text>
          </View>
        </View>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  saludo: { color: '#888', fontSize: 13 },
  appNombre: { color: '#F5F5F5', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  botonMoneda: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#222' },
  botonMonedaTexto: { color: '#888', fontSize: 12, fontWeight: '600' },
  totalContainer: { alignItems: 'center', paddingVertical: 20 },
  totalLabel: { color: '#555', fontSize: 11, letterSpacing: 1 },
  totalValor: { color: '#F5F5F5', fontSize: 38, fontWeight: '800', marginTop: 6 },
  variacionBadge: { backgroundColor: '#00D26A22', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  variacionTexto: { color: '#00D26A', fontSize: 13, fontWeight: '700' },
  tarjetasRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  tarjeta: { flex: 1, backgroundColor: '#141414', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  tarjetaLabel: { color: '#555', fontSize: 10 },
  tarjetaValor: { color: '#F5F5F5', fontSize: 14, fontWeight: '700', marginTop: 4 },
  seccionTitulo: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12 },
  filtrosRow: { paddingHorizontal: 20, marginBottom: 16 },
  filtroBoton: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: '#222' },
  filtroTexto: { color: '#888', fontSize: 12, fontWeight: '600' },
  activoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  activoIcono: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#00D26A22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#00D26A33' },
  activoIconoTexto: { color: '#00D26A', fontWeight: '800', fontSize: 16 },
  activoInfo: { flex: 1 },
  activoTicker: { color: '#F5F5F5', fontWeight: '700', fontSize: 15 },
  activoNombre: { color: '#888', fontSize: 12, marginTop: 2 },
  activoDerecha: { alignItems: 'flex-end' },
  activoValor: { color: '#F5F5F5', fontWeight: '700', fontSize: 14 },
  activoCambio: { fontSize: 12, marginTop: 2, fontWeight: '600' },
});