import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Perfil() {
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = getStyles(theme);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [iniciales, setIniciales] = useState('');
  const [miembroDesde, setMiembroDesde] = useState('');
  const [cantActivos, setCantActivos] = useState(0);
  const [cantOperaciones, setCantOperaciones] = useState(0);
  const [rentabilidad, setRentabilidad] = useState(0);
  const [ccl, setCcl] = useState(0);
  const [mep, setMep] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fecha = new Date(user.created_at);
    const mes = fecha.toLocaleString('es-AR', { month: 'short' });
    const anio = fecha.getFullYear();
    setMiembroDesde(`Miembro desde ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`);

    const email = user.email ?? '';
    const nombreBase = email.split('@')[0];
    const nombre = nombreBase.charAt(0).toUpperCase() + nombreBase.slice(1);
    setNombreUsuario(nombre);
    setIniciales(nombre.slice(0, 2).toUpperCase());

    const [{ data: posiciones }, { data: operaciones }, { data: precios }] = await Promise.all([
      supabase.from('posiciones').select('*').eq('usuario_id', user.id),
      supabase.from('operaciones').select('id').eq('usuario_id', user.id),
      supabase.from('precios_cache').select('ticker, precio'),
    ]);

    setCantActivos(posiciones?.length ?? 0);
    setCantOperaciones(operaciones?.length ?? 0);

    const cclPrecio = precios?.find(p => p.ticker === 'CCL')?.precio ?? 0;
    const mepPrecio = precios?.find(p => p.ticker === 'MEP')?.precio ?? 0;
    setCcl(cclPrecio);
    setMep(mepPrecio);

    if (posiciones && precios) {
      const mapaPrecios: Record<string, number> = {};
      precios.forEach(p => { mapaPrecios[p.ticker] = p.precio; });

      const totalInvertido = posiciones.reduce((s, p) => s + p.cantidad * p.precio_compra, 0);
      const totalActual = posiciones.reduce((s, p) => {
        const key = p.categoria === 'cedear' ? `${p.ticker}.BA` : p.ticker;
        const precio = mapaPrecios[key] ?? mapaPrecios[p.ticker] ?? p.precio_compra;
        return s + p.cantidad * precio;
      }, 0);

      const rent = totalInvertido > 0 ? ((totalActual - totalInvertido) / totalInvertido) * 100 : 0;
      setRentabilidad(rent);
    }

    setCargando(false);
  }

  const opciones = [
    { icon: '🔔', label: 'Alertas de precio', desc: 'Stop Loss y Stop Gain' },
    { icon: '💱', label: 'Tipo de cambio', desc: ccl > 0 ? `CCL $${ccl.toLocaleString('es-AR')} · MEP $${mep > 0 ? mep.toLocaleString('es-AR') : 'N/D'}` : 'Cargando...' },
    { icon: '📤', label: 'Exportar cartera', desc: 'Excel · CSV · PDF' },
    { icon: '📅', label: 'Calendario de pagos', desc: 'Dividendos y vencimientos' },
    { icon: '🌙', label: 'Modo oscuro', desc: isDark ? 'Activo' : 'Inactivo' },
    { icon: '⚙️', label: 'Configuración', desc: 'Cuenta y preferencias' },
    { icon: '🚪', label: 'Cerrar sesión', desc: 'Salir de tu cuenta' },
  ];

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.titulo}>Perfil 👤</Text>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      ) : (
        <>
          {/* AVATAR */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciales}</Text>
            </View>
            <Text style={styles.nombre}>{nombreUsuario}</Text>
            <Text style={styles.miembro}>{miembroDesde}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planTexto}>⭐ Plan Free</Text>
            </View>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValor, { color: rentabilidad >= 0 ? theme.green : theme.red }]}>
                {rentabilidad >= 0 ? '+' : ''}{rentabilidad.toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Rentabilidad</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValor, { color: theme.blue }]}>{cantActivos}</Text>
              <Text style={styles.statLabel}>Activos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValor, { color: theme.gold }]}>{cantOperaciones}</Text>
              <Text style={styles.statLabel}>Operaciones</Text>
            </View>
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
              <TouchableOpacity
                key={i}
                style={[styles.opcionFila, i === opciones.length - 1 && { borderBottomWidth: 0 }]}
                onPress={
                  op.label === 'Modo oscuro' ? toggleTheme :
                  op.label === 'Cerrar sesión' ? () => supabase.auth.signOut() :
                  undefined
                }>
                <View style={styles.opcionIcono}>
                  <Text style={{ fontSize: 18 }}>{op.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.opcionLabel, op.label === 'Cerrar sesión' && { color: theme.red }]}>{op.label}</Text>
                  <Text style={styles.opcionDesc}>{op.desc}</Text>
                </View>
                {op.label === 'Modo oscuro'
                  ? <View style={{
                      width: 44, height: 26, borderRadius: 13,
                      backgroundColor: isDark ? theme.green : theme.border,
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                    }}>
                      <View style={{
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: '#FFF',
                        alignSelf: isDark ? 'flex-end' : 'flex-start',
                      }} />
                    </View>
                  : <Text style={styles.opcionFlecha}>›</Text>
                }
              </TouchableOpacity>
            ))}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerTexto}>A Contar · v0.1</Text>
            <Text style={styles.footerTexto}>Hecho en Argentina 🇦🇷</Text>
          </View>
        </>
      )}

    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { padding: 20, paddingTop: 60 },
  titulo: { color: theme.white, fontSize: 22, fontWeight: '800' },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  avatarContainer: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.greenDim, borderWidth: 2, borderColor: theme.green + '55', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTexto: { color: theme.green, fontSize: 24, fontWeight: '800' },
  nombre: { color: theme.white, fontSize: 20, fontWeight: '700' },
  miembro: { color: theme.gray, fontSize: 12, marginTop: 4 },
  planBadge: { backgroundColor: theme.gold + '22', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 10 },
  planTexto: { color: theme.gold, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statValor: { fontSize: 16, fontWeight: '800' },
  statLabel: { color: theme.gray, fontSize: 10, marginTop: 4 },
  upgradeBanner: { marginHorizontal: 20, marginBottom: 20, backgroundColor: theme.greenDim, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.green + '33' },
  upgradeTitle: { color: theme.white, fontWeight: '700', fontSize: 14 },
  upgradeDesc: { color: theme.lgray, fontSize: 12, marginTop: 2 },
  upgradePrecio: { color: theme.green, fontWeight: '700', fontSize: 13 },
  tabla: { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  opcionFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 14 },
  opcionIcono: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.card2, alignItems: 'center', justifyContent: 'center' },
  opcionLabel: { color: theme.white, fontSize: 13, fontWeight: '600' },
  opcionDesc: { color: theme.gray, fontSize: 11, marginTop: 2 },
  opcionFlecha: { color: theme.gray, fontSize: 20 },
  footer: { alignItems: 'center', paddingVertical: 30, gap: 4 },
  footerTexto: { color: theme.gray, fontSize: 11 },
});