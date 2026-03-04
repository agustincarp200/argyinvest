import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const stats = [
  { label: 'Rentabilidad', valor: '+21.4%', color: '#00D26A' },
  { label: 'Activos', valor: '19', color: '#4D9EFF' },
  { label: 'Operaciones', valor: '34', color: '#F5C842' },
];

const opciones = [
  { icon: '🔔', label: 'Alertas de precio', desc: 'Stop Loss y Stop Gain' },
  { icon: '💱', label: 'Tipo de cambio', desc: 'CCL $1.285 · MEP $1.271' },
  { icon: '📤', label: 'Exportar cartera', desc: 'Excel · CSV · PDF' },
  { icon: '📅', label: 'Calendario de pagos', desc: 'Dividendos y vencimientos' },
  { icon: '🌙', label: 'Modo oscuro', desc: 'Activo' },
  { icon: '⚙️', label: 'Configuración', desc: 'Cuenta y preferencias' },
];

export default function Perfil() {
  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.titulo}>Perfil 👤</Text>
      </View>

      {/* AVATAR */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>AG</Text>
        </View>
        <Text style={styles.nombre}>Agust</Text>
        <Text style={styles.miembro}>Miembro desde Nov 2024</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planTexto}>⭐ Plan Free</Text>
        </View>
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValor, { color: s.color }]}>{s.valor}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* UPGRADE BANNER */}
      <TouchableOpacity style={styles.upgradeBanner}>
        <View>
          <Text style={styles.upgradeTitle}>🚀 Pasate a Premium</Text>
          <Text style={styles.upgradeDesc}>Alertas, activos ilimitados y más</Text>
        </View>
        <Text style={styles.upgradePrecio}>USD 4.99/mes →</Text>
      </TouchableOpacity>

      {/* OPCIONES */}
      <View style={styles.tabla}>
        {opciones.map((op, i) => (
          <TouchableOpacity key={i} style={styles.opcionFila}>
            <View style={styles.opcionIcono}>
              <Text style={{ fontSize: 18 }}>{op.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opcionLabel}>{op.label}</Text>
              <Text style={styles.opcionDesc}>{op.desc}</Text>
            </View>
            <Text style={styles.opcionFlecha}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerTexto}>ArgylnVest · v0.1</Text>
        <Text style={styles.footerTexto}>Hecho en Argentina 🇦🇷</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 20, paddingTop: 60 },
  titulo: { color: '#F5F5F5', fontSize: 22, fontWeight: '800' },
  avatarContainer: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#00D26A22', borderWidth: 2, borderColor: '#00D26A55', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTexto: { color: '#00D26A', fontSize: 24, fontWeight: '800' },
  nombre: { color: '#F5F5F5', fontSize: 20, fontWeight: '700' },
  miembro: { color: '#555', fontSize: 12, marginTop: 4 },
  planBadge: { backgroundColor: '#F5C84222', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 10 },
  planTexto: { color: '#F5C842', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#141414', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statValor: { fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#555', fontSize: 10, marginTop: 4 },
  upgradeBanner: { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#00D26A18', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#00D26A33' },
  upgradeTitle: { color: '#F5F5F5', fontWeight: '700', fontSize: 14 },
  upgradeDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  upgradePrecio: { color: '#00D26A', fontWeight: '700', fontSize: 13 },
  tabla: { backgroundColor: '#141414', borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#222' },
  opcionFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', gap: 14 },
  opcionIcono: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  opcionLabel: { color: '#F5F5F5', fontSize: 13, fontWeight: '600' },
  opcionDesc: { color: '#555', fontSize: 11, marginTop: 2 },
  opcionFlecha: { color: '#555', fontSize: 20 },
  footer: { alignItems: 'center', paddingVertical: 30, gap: 4 },
  footerTexto: { color: '#333', fontSize: 11 },
});