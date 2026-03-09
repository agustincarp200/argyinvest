import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
type Precio = {
  ticker: string;
  precio: number;
  variacion_pct: number;
  moneda: string;
  categoria: string;
};

export default function Mercado() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState('');

  async function cargarPrecios() {
    setCargando(true);
    const { data, error } = await supabase
      .from('precios_cache')
      .select('*')
      .order('categoria');
    if (data) {
      setPrecios(data);
      setUltimaActualizacion(new Date().toLocaleTimeString('es-AR'));
    }
    setCargando(false);
  }

  useEffect(() => { cargarPrecios(); }, []);

  const ccl = precios.find(p => p.ticker === 'CCL')?.precio ?? 1285;
  const cedears = precios.filter(p => p.categoria === 'cedear');
  const byma = precios.filter(p => p.categoria === 'byma');
  const nasdaq = precios.filter(p => p.categoria === 'nasdaq');
  const crypto = precios.filter(p => p.categoria === 'crypto');

  function FilaActivo({ item }: { item: Precio }) {
    const positivo = item.variacion_pct >= 0;
    return (
      <View style={styles.fila}>
        <View style={styles.filaIcono}>
          <Text style={styles.filaIconoTexto}>{item.ticker[0]}</Text>
        </View>
        <Text style={styles.filaTicker}>{item.ticker.replace('.BA', '')}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.filaValor}>
          {item.moneda === 'USD' ? 'USD ' : '$ '}
          {item.precio.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
        </Text>
        <View style={[styles.filaBadge, { backgroundColor: positivo ? '#00D26A22' : '#FF4D4D22' }]}>
          <Text style={[styles.filaCambio, { color: positivo ? '#00D26A' : '#FF4D4D' }]}>
            {positivo ? '+' : ''}{item.variacion_pct.toFixed(2)}%
          </Text>
        </View>
      </View>
    );
  }

  function Seccion({ titulo, datos }: { titulo: string; datos: Precio[] }) {
    if (datos.length === 0) return null;
    return (
      <>
        <Text style={styles.seccion}>{titulo}</Text>
        <View style={styles.tabla}>
          {datos.map((item) => <FilaActivo key={item.ticker} item={item} />)}
        </View>
      </>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Mercado 📊</Text>
        <TouchableOpacity onPress={cargarPrecios}>
          <Text style={styles.actualizar}>🔄 Actualizar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitulo}>
        CCL <Text style={styles.ccl}>${ccl.toLocaleString('es-AR')}</Text>
        {ultimaActualizacion ? ` · ${ultimaActualizacion}` : ''}
      </Text>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D26A" />
          <Text style={styles.loadingTexto}>Cargando precios reales...</Text>
        </View>
      ) : (
        <>
          <Seccion titulo="🏷️ CEDEARs" datos={cedears} />
          <Seccion titulo="🇦🇷 Acciones BYMA" datos={byma} />
          <Seccion titulo="🌎 NYSE / NASDAQ" datos={nasdaq} />
          <Seccion titulo="₿ Crypto" datos={crypto} />
        </>
      )}
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { color: theme.white, fontSize: 22, fontWeight: '800' },
  actualizar: { color: theme.green, fontSize: 13, fontWeight: '600' },
  subtitulo: { color: theme.gray, fontSize: 12, paddingHorizontal: 20, marginBottom: 20 },
  ccl: { color: theme.gold, fontWeight: '700' },
  loadingContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
  loadingTexto: { color: theme.gray, fontSize: 14 },
  seccion: { color: theme.white, fontSize: 15, fontWeight: '700', paddingHorizontal: 20, marginBottom: 10 },
  tabla: { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 10 },
  filaIcono: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.card2, alignItems: 'center', justifyContent: 'center' },
  filaIconoTexto: { color: theme.lgray, fontWeight: '800', fontSize: 14 },
  filaTicker: { color: theme.white, fontWeight: '700', fontSize: 14 },
  filaValor: { color: theme.white, fontSize: 13, marginRight: 8 },
  filaBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  filaCambio: { fontSize: 12, fontWeight: '700' },
});