import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type PrecioItem = {
  ticker: string;
  precio: number;
  variacion_pct: number;
  moneda: string;
  categoria: string;
};

type FciItem = {
  id_cafci: number;
  ticker: string;
  nombre: string;
  categoria: string;
  cuotaparte: number;
  variacion_diaria: number;
  rendimiento_30d: number | null;
  rendimiento_1a: number | null;
  moneda: string;
};

const TABS = [
  { id: 'cedear', label: 'CEDEARs' },
  { id: 'byma', label: 'BYMA' },
  { id: 'nasdaq', label: 'NYSE' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'fci', label: 'FCIs' },
];

const NOMBRES: Record<string, string> = {
  AAPL: 'Apple', GOOGL: 'Alphabet', MSFT: 'Microsoft', AMZN: 'Amazon',
  NVDA: 'NVIDIA', META: 'Meta', TSLA: 'Tesla', AMD: 'AMD',
  BABA: 'Alibaba', MELI: 'MercadoLibre', NFLX: 'Netflix', DIS: 'Disney',
  GGAL: 'Gal. Galicia', PAMP: 'Pampa Energía', BMA: 'Banco Macro',
  ALUA: 'Aluar', TXAR: 'Ternium Arg.', CRES: 'Cresud',
  CEPU: 'Central Puerto', LOMA: 'Loma Negra', VALO: 'Gal. Valores',
  SUPV: 'Supervielle', YPF: 'YPF', TECO2: 'Telecom',
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana',
  ADA: 'Cardano', USDT: 'Tether', BNB: 'BNB', XRP: 'Ripple',
};

const LABEL_FCI: Record<string, string> = {
  money_market: 'Money Market',
  renta_fija: 'Renta Fija',
  renta_fija_usd: 'Renta Fija USD',
  renta_variable: 'Renta Variable',
  renta_variable_usd: 'Renta Variable USD',
  dollar_linked: 'Dollar Linked',
  mixto: 'Mixto',
  mixto_usd: 'Mixto USD',
  cer: 'CER',
  infraestructura: 'Infraestructura',
  pymes: 'Pymes',
  retiro: 'Retiro',
};

const COLOR_FCI: Record<string, string> = {
  money_market: '#22D3EE',
  renta_fija: '#4D9EFF',
  renta_fija_usd: '#60A5FA',
  renta_variable: '#A855F7',
  renta_variable_usd: '#C084FC',
  dollar_linked: '#F59E0B',
  mixto: '#FF9D4D',
  mixto_usd: '#FF6B35',
  cer: '#00C9A7',
  infraestructura: '#F5C842',
  pymes: '#FB923C',
  retiro: '#94A3B8',
};

export default function Mercado() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [tabActiva, setTabActiva] = useState('cedear');
  const [precios, setPrecios] = useState<PrecioItem[]>([]);
  const [fcis, setFcis] = useState<FciItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFci, setCategoriaFci] = useState<string | null>(null);

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    await Promise.all([cargarPrecios(), cargarFcis()]);
    setCargando(false);
  }

  async function cargarPrecios() {
    const { data } = await supabase.from('precios_cache').select('*');
    if (data) setPrecios(data);
  }

  async function cargarFcis() {
    const { data } = await supabase
      .from('fci_cache')
      .select('*')
      .order('categoria')
      .order('rendimiento_30d', { ascending: false });
    if (data) setFcis(data);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([cargarPrecios(), cargarFcis()]);
    setRefreshing(false);
  }

  function getPreciosFiltrados(): PrecioItem[] {
    let items = precios;
    if (tabActiva === 'cedear') items = precios.filter(p => p.categoria === 'cedear');
    else if (tabActiva === 'byma') items = precios.filter(p => p.categoria === 'byma');
    else if (tabActiva === 'nasdaq') items = precios.filter(p => p.categoria === 'nasdaq');
    else if (tabActiva === 'crypto') items = precios.filter(p => p.categoria === 'crypto');

    if (busqueda) {
      const q = busqueda.toUpperCase();
      items = items.filter(p =>
        p.ticker.includes(q) || (NOMBRES[p.ticker] ?? '').toUpperCase().includes(q)
      );
    }
    return items;
  }

  function getFcisFiltrados(): FciItem[] {
    let items = fcis;
    if (categoriaFci) items = items.filter(f => f.categoria === categoriaFci);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      items = items.filter(f => f.nombre.toLowerCase().includes(q) || f.categoria.includes(q));
    }
    return items;
  }

  const categoriasFci = [...new Set(fcis.map(f => f.categoria))].sort();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.green} />}>

      <View style={styles.header}>
        <Text style={styles.titulo}>Mercado 📈</Text>
      </View>

      {/* BUSCADOR */}
      <View style={styles.buscadorContainer}>
        <Text style={styles.buscadorIcono}>🔍</Text>
        <TextInput
          style={styles.buscadorInput}
          placeholder={tabActiva === 'fci' ? 'Buscar fondo...' : 'Buscar ticker o empresa...'}
          placeholderTextColor={theme.gray}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="characters"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Text style={{ color: theme.gray, fontSize: 16, paddingRight: 4 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, tabActiva === tab.id && { backgroundColor: theme.green }]}
            onPress={() => { setTabActiva(tab.id); setBusqueda(''); setCategoriaFci(null); }}>
            <Text style={[styles.tabTexto, tabActiva === tab.id && { color: '#000' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      ) : tabActiva === 'fci' ? (

        // ── VISTA FCIs ──────────────────────────────────
        <>
          {/* Filtro por categoría */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFciContainer}>
            <TouchableOpacity
              style={[styles.catFciBoton, !categoriaFci && { backgroundColor: theme.green }]}
              onPress={() => setCategoriaFci(null)}>
              <Text style={[styles.catFciTexto, !categoriaFci && { color: '#000' }]}>Todos</Text>
            </TouchableOpacity>
            {categoriasFci.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catFciBoton, categoriaFci === cat && { backgroundColor: COLOR_FCI[cat] ?? theme.green, borderColor: COLOR_FCI[cat] ?? theme.green }]}
                onPress={() => setCategoriaFci(cat)}>
                <Text style={[styles.catFciTexto, categoriaFci === cat && { color: '#000' }]}>
                  {LABEL_FCI[cat] ?? cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {getFcisFiltrados().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexto}>Sin fondos disponibles aún</Text>
              <Text style={styles.emptySubTexto}>El worker actualiza los FCIs cada hora</Text>
            </View>
          ) : (
            <View style={styles.tabla}>
              {getFcisFiltrados().map((fci, i) => {
                const esPositivo = (fci.variacion_diaria ?? 0) >= 0;
                const color = COLOR_FCI[fci.categoria] ?? theme.green;
                return (
                  <View key={fci.id_cafci} style={[styles.filaFci, i === getFcisFiltrados().length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.filaIcono, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.filaIconoTexto, { color }]}>F</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filaNombreFci} numberOfLines={2}>{fci.nombre}</Text>
                      <View style={[styles.catBadge, { backgroundColor: color + '22' }]}>
                        <Text style={[styles.catBadgeTexto, { color }]}>
                          {LABEL_FCI[fci.categoria] ?? fci.categoria}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 100 }}>
                      <Text style={styles.filaCuotaparte}>
                        ${fci.cuotaparte?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </Text>
                      <Text style={[styles.filaVariacion, { color: esPositivo ? theme.green : theme.red }]}>
                        {esPositivo ? '+' : ''}{(fci.variacion_diaria ?? 0).toFixed(2)}% hoy
                      </Text>
                      <View style={styles.rendRow}>
                        {fci.rendimiento_30d !== null && (
                          <Text style={[styles.rendTexto, { color: (fci.rendimiento_30d ?? 0) >= 0 ? theme.green : theme.red }]}>
                            30d: {(fci.rendimiento_30d ?? 0) >= 0 ? '+' : ''}{fci.rendimiento_30d?.toFixed(1)}%
                          </Text>
                        )}
                        {fci.rendimiento_1a !== null && (
                          <Text style={[styles.rendTexto, { color: (fci.rendimiento_1a ?? 0) >= 0 ? theme.green : theme.red }]}>
                            1a: {(fci.rendimiento_1a ?? 0) >= 0 ? '+' : ''}{fci.rendimiento_1a?.toFixed(1)}%
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>

      ) : (

        // ── VISTA PRECIOS ───────────────────────────────
        <View style={styles.tabla}>
          {getPreciosFiltrados().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexto}>Sin resultados</Text>
            </View>
          ) : (
            getPreciosFiltrados().map((item, i) => {
              const esPositivo = item.variacion_pct >= 0;
              const nombre = NOMBRES[item.ticker] ?? item.ticker;
              return (
                <TouchableOpacity
                  key={item.ticker}
                  style={[styles.fila, i === getPreciosFiltrados().length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => router.push({
                    pathname: '/detalle',
                    params: {
                      ticker: item.ticker,
                      nombre,
                      precioActual: item.precio.toString(),
                      gpPct: '0',
                      categoria: item.categoria,
                      cantidad: '0',
                      precioCompra: '0',
                    }
                  })}>
                  <View style={[styles.filaIcono, { backgroundColor: esPositivo ? theme.greenDim : theme.redDim }]}>
                    <Text style={[styles.filaIconoTexto, { color: esPositivo ? theme.green : theme.red }]}>
                      {item.ticker[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filaTicker}>{item.ticker}</Text>
                    <Text style={styles.filaNombre}>{nombre}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.filaPrecio}>
                      {item.moneda === 'USD' ? 'u$s' : '$'} {item.precio.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </Text>
                    <View style={[styles.variacionBadge, { backgroundColor: esPositivo ? theme.greenDim : theme.redDim }]}>
                      <Text style={[styles.variacionTexto, { color: esPositivo ? theme.green : theme.red }]}>
                        {esPositivo ? '+' : ''}{item.variacion_pct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { padding: 20, paddingTop: 60 },
  titulo: { color: theme.white, fontSize: 22, fontWeight: '800' },
  buscadorContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.border },
  buscadorIcono: { fontSize: 16, marginRight: 8 },
  buscadorInput: { flex: 1, color: theme.white, fontSize: 14, paddingVertical: 12 },
  tabsContainer: { paddingHorizontal: 20, marginBottom: 16 },
  tab: { backgroundColor: theme.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  tabTexto: { color: theme.lgray, fontSize: 13, fontWeight: '700' },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  tabla: { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  filaFci: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  filaIcono: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filaIconoTexto: { fontWeight: '800', fontSize: 16 },
  filaTicker: { color: theme.white, fontWeight: '700', fontSize: 15 },
  filaNombre: { color: theme.gray, fontSize: 11, marginTop: 2 },
  filaNombreFci: { color: theme.white, fontWeight: '600', fontSize: 12, marginBottom: 4, flex: 1 },
  filaPrecio: { color: theme.white, fontWeight: '700', fontSize: 14 },
  filaCuotaparte: { color: theme.white, fontWeight: '700', fontSize: 13 },
  filaVariacion: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  variacionBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  variacionTexto: { fontSize: 11, fontWeight: '700' },
  catFciContainer: { paddingHorizontal: 20, marginBottom: 12 },
  catFciBoton: { backgroundColor: theme.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  catFciTexto: { color: theme.lgray, fontSize: 12, fontWeight: '600' },
  catBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  catBadgeTexto: { fontSize: 10, fontWeight: '700' },
  rendRow: { flexDirection: 'row', gap: 6, marginTop: 3 },
  rendTexto: { fontSize: 10, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTexto: { color: theme.gray, fontSize: 14, fontWeight: '600' },
  emptySubTexto: { color: theme.lgray, fontSize: 12 },
});