import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NOMBRES: Record<string, string> = {
  'AAPL': 'Apple', 'GOOGL': 'Alphabet', 'MSFT': 'Microsoft',
  'AMZN': 'Amazon', 'NVDA': 'NVIDIA', 'META': 'Meta',
  'TSLA': 'Tesla', 'AMD': 'AMD', 'BABA': 'Alibaba', 'MELI': 'MercadoLibre',
  'GGAL.BA': 'Grupo Galicia', 'PAMP.BA': 'Pampa Energía',
  'BMA.BA': 'Banco Macro', 'ALUA.BA': 'Aluar', 'TXAR.BA': 'Ternium',
  'CRES.BA': 'Cresud', 'CEPU.BA': 'Central Puerto', 'LOMA.BA': 'Loma Negra',
  'VALO.BA': 'Grupo Supervielle', 'SUPV.BA': 'Supervielle',
  'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana',
  'ADA': 'Cardano', 'USDT': 'Tether',
};

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
    const { data } = await supabase.from('precios_cache').select('*').order('categoria');
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

    function irADetalle() {
      router.push({
        pathname: '/detalle',
        params: {
          ticker: item.ticker,
          nombre: NOMBRES[item.ticker] ?? item.ticker.replace('.BA', ''),
          precioActual: item.precio.toString(),
          gpPct: '0',
        }
      });
    }

    return (
      <TouchableOpacity style={styles.fila} onPress={irADetalle} activeOpacity={0.7}>
        <View style={styles.filaIcono}>
          <Text style={styles.filaIconoTexto}>{item.ticker[0]}</Text>
        </View>
        <View>
          <Text style={styles.filaTicker}>{item.ticker.replace('.BA', '')}</Text>
          <Text style={styles.filaNombre}>{NOMBRES[item.ticker] ?? NOMBRES[item.ticker + '.BA'] ?? NOMBRES[item.ticker.replace('.BA', '')] ?? ''}</Text>
        </View>
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
        <Text style={styles.filaFlecha}>›</Text>
      </TouchableOpacity>
    );
  }

  function Seccion({ titulo, datos }: { titulo: string; datos: Precio[] }) {
    if (datos.length === 0) return null;
    return (
      <>
        <Text style={styles.seccion}>{titulo}</Text>
        <View style={styles.tabla}>
          {datos.map((item, i) => (
            <View key={item.ticker} style={i === datos.length - 1 && { borderBottomWidth: 0 }}>
              <FilaActivo item={item} />
            </View>
          ))}
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
  filaNombre: { color: theme.gray, fontSize: 10, marginTop: 1 },
  filaValor: { color: theme.white, fontSize: 13, marginRight: 8 },
  filaBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  filaCambio: { fontSize: 12, fontWeight: '700' },
  filaFlecha: { color: theme.gray, fontSize: 18, marginLeft: 4 },
});