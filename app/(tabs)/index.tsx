import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { buscarTickers, COLORES_CATEGORIA, type TickerSugerido } from '@/lib/tickers';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type Posicion = {
  id: string;
  ticker: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  precio_compra: number;
  moneda: string;
  fecha_compra: string;
};

type PosicionAgrupada = {
  ticker: string;
  nombre: string;
  categoria: string;
  moneda: string;
  cantidadTotal: number;
  ppc: number;
  subPosiciones: Posicion[];
};

const CATEGORIAS = [
  { id: 'cedear',    label: 'CEDEAR',      color: '#F5C842' },
  { id: 'byma',     label: 'BYMA',         color: '#4D9EFF' },
  { id: 'nasdaq',   label: 'NYSE/NASDAQ',  color: '#A855F7' },
  { id: 'crypto',   label: 'Crypto',       color: '#F59E0B' },
  { id: 'bono_ars', label: 'Bono ARS',     color: '#FF9D4D' },
  { id: 'bono_usd', label: 'Bono USD',     color: '#FF6B35' },
  { id: 'letra',    label: 'Letra',        color: '#00C9A7' },
  { id: 'on',       label: 'ON',           color: '#C084FC' },
  { id: 'fci',      label: 'FCI',          color: '#22D3EE' },
];

const CATS_USD = ['nasdaq', 'crypto', 'bono_usd'];
const CATS_ARS = ['byma', 'bono_ars', 'letra', 'fci', 'on'];

const PERIODOS = ['1D', '7D', '1M', '3M', '1A', 'Máx'];

// ── Sparkline SVG ──────────────────────────────────────
function Sparkline({ data, color, width = 60, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height * 0.85 - height * 0.075;
    return `${x},${y}`;
  });
  const d = `M ${pts.join(' L ')}`;
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Gráfico evolución cartera ──────────────────────────
function GraficoCartera({ datos, positivo, theme }: { datos: number[]; positivo: boolean; theme: any }) {
  if (!datos || datos.length < 2) return null;
  const W = 340; const H = 120;
  const min = Math.min(...datos);
  const max = Math.max(...datos);
  const range = max - min || 1;
  const pts = datos.map((v, i) => {
    const x = (i / (datos.length - 1)) * W;
    const y = H - ((v - min) / range) * H * 0.8 - H * 0.1;
    return { x, y };
  });
  const linePath = `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaPath = `M ${pts[0].x},${H} ${pts.map(p => `L ${p.x},${p.y}`).join(' ')} L ${pts[pts.length-1].x},${H} Z`;
  const esPositivoPeriodo = datos[datos.length - 1] >= datos[0];
  const color = esPositivoPeriodo ? '#00D26A' : '#FF4D4D';

  return (
    <Svg width={W} height={H} style={{ marginTop: 8 }}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#grad)" />
      <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function agruparPosiciones(posiciones: Posicion[]): PosicionAgrupada[] {
  const mapa: Record<string, PosicionAgrupada> = {};
  for (const pos of posiciones) {
    if (!mapa[pos.ticker]) {
      mapa[pos.ticker] = { ticker: pos.ticker, nombre: pos.nombre, categoria: pos.categoria, moneda: pos.moneda, cantidadTotal: 0, ppc: 0, subPosiciones: [] };
    }
    const g = mapa[pos.ticker];
    const totalAnterior = g.cantidadTotal * g.ppc;
    g.cantidadTotal += pos.cantidad;
    g.ppc = (totalAnterior + pos.cantidad * pos.precio_compra) / g.cantidadTotal;
    g.subPosiciones.push(pos);
  }
  return Object.values(mapa);
}

function fechaAInput(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function inputAFecha(input: string) {
  const [d, m, y] = input.split('/');
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
function formatearFechaInput(texto: string) {
  const solo = texto.replace(/\D/g, '').slice(0, 8);
  let r = solo;
  if (solo.length > 2) r = solo.slice(0, 2) + '/' + solo.slice(2);
  if (solo.length > 4) r = solo.slice(0, 2) + '/' + solo.slice(2, 4) + '/' + solo.slice(4);
  return r;
}

function getYFTicker(ticker: string, categoria: string): string {
  if (categoria === 'crypto') {
    const mapa: Record<string, string> = { BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', ADA: 'ADA-USD', USDT: 'USDT-USD' };
    return mapa[ticker] ?? `${ticker}-USD`;
  }
  if (['byma', 'bono_ars', 'letra', 'on'].includes(categoria)) return `${ticker}.BA`;
  return ticker;
}

export default function Inicio() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme);

  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [modoMoneda, setModoMoneda] = useState<'ARS' | 'USD'>('ARS');

  // Gráfico evolución
  const [periodoActivo, setPeriodoActivo] = useState('1M');
  const [datosGrafico, setDatosGrafico] = useState<number[]>([]);
  const [cargandoGrafico, setCargandoGrafico] = useState(false);

  // Sparklines por ticker
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  // Modal agregar
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [menuPos, setMenuPos] = useState<PosicionAgrupada | null>(null);
  const [menuSubPosVisible, setMenuSubPosVisible] = useState(false);

  const [ticker, setTicker] = useState('');
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('cedear');
  const [moneda, setMoneda] = useState('ARS');
  const [sugerencias, setSugerencias] = useState<TickerSugerido[]>([]);
  const [fechaCompra, setFechaCompra] = useState(fechaAInput(new Date().toISOString().split('T')[0]));

  const [editNombre, setEditNombre] = useState('');
  const [editCantidad, setEditCantidad] = useState('');
  const [editPrecioCompra, setEditPrecioCompra] = useState('');
  const [editCategoria, setEditCategoria] = useState('cedear');
  const [editMoneda, setEditMoneda] = useState('ARS');
  const [posEditando, setPosEditando] = useState<Posicion | null>(null);

  const refNombre = useRef<TextInput>(null);
  const refCantidad = useRef<TextInput>(null);
  const refPrecio = useRef<TextInput>(null);
  const refFechaCompra = useRef<TextInput>(null);
  const refEditCantidad = useRef<TextInput>(null);
  const refEditPrecio = useRef<TextInput>(null);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    const show = Keyboard.addListener('keyboardWillShow', () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut));
    const hide = Keyboard.addListener('keyboardWillHide', () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut));
    return () => { show.remove(); hide.remove(); };
  }, []);

  async function cargarDatos() {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: pos }, { data: prec }, { data: userData }] = await Promise.all([
      supabase.from('posiciones').select('*').eq('usuario_id', user.id),
      supabase.from('precios_cache').select('ticker, precio'),
      supabase.from('usuarios').select('nombre').eq('id', user.id).single(),
    ]);

    if (pos) setPosiciones(pos);
    if (prec) {
      const mapa: Record<string, number> = {};
      prec.forEach(p => { mapa[p.ticker] = p.precio; });
      setPrecios(mapa);
    }
    if (userData?.nombre) setNombreUsuario(userData.nombre);
    else if (user.email) setNombreUsuario(user.email.split('@')[0]);

    setCargando(false);
  }

  useEffect(() => { cargarDatos(); }, []);

  const posicionesAgrupadas = agruparPosiciones(posiciones);

  // Cargar sparklines para cada activo
  useEffect(() => {
    if (posicionesAgrupadas.length === 0) return;
    posicionesAgrupadas.forEach(async (pos) => {
      try {
        const yfTicker = getYFTicker(pos.ticker, pos.categoria);
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yfTicker}?interval=1d&range=1mo`);
        const json = await res.json();
        const closes: number[] = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
          .filter((v: any) => v !== null && !isNaN(v));
        if (closes.length >= 5) {
          setSparklines(prev => ({ ...prev, [pos.ticker]: closes }));
        }
      } catch {}
    });
  }, [posiciones]);

  // Cargar gráfico de evolución de cartera
  async function cargarGraficoCartera(periodo: string) {
    if (posicionesAgrupadas.length === 0) return;
    setCargandoGrafico(true);
    try {
      const rangeMap: Record<string, string> = { '1D': '1d', '7D': '5d', '1M': '1mo', '3M': '3mo', '1A': '1y', 'Máx': '5y' };
      const intervalMap: Record<string, string> = { '1D': '5m', '7D': '1h', '1M': '1d', '3M': '1d', '1A': '1wk', 'Máx': '1mo' };
      const range = rangeMap[periodo] ?? '1mo';
      const interval = intervalMap[periodo] ?? '1d';

      // Usar SPY como proxy del portfolio para el gráfico de forma (escala real después)
      // En realidad calculamos valor total diario sumando posiciones × precio histórico
      // Por simplicidad y velocidad, usamos el primer activo más pesado como proxy de forma
      const principal = posicionesAgrupadas.sort((a, b) => b.cantidadTotal * b.ppc - a.cantidadTotal * a.ppc)[0];
      const yfTicker = getYFTicker(principal.ticker, principal.categoria);
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yfTicker}?interval=${interval}&range=${range}`);
      const json = await res.json();
      const closes: number[] = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
        .filter((v: any) => v !== null && !isNaN(v));

      if (closes.length >= 2) {
        // Normalizar: escalar los cierres para que reflejen el valor del portfolio
        const precioActualActivo = closes[closes.length - 1];
        const valorActualPortfolio = totalActual;
        const factor = valorActualPortfolio / precioActualActivo;
        setDatosGrafico(closes.map(c => c * factor));
      }
    } catch {}
    setCargandoGrafico(false);
  }

  useEffect(() => {
    if (!cargando && posicionesAgrupadas.length > 0) cargarGraficoCartera(periodoActivo);
  }, [cargando, periodoActivo]);

  const ccl = precios['CCL'] ?? 1285;

  const getPrecioActual = (ticker: string, categoria: string, precio_compra: number): number => {
    if (categoria === 'cedear') {
      const precioARS = precios[`${ticker}.BA`];
      if (precioARS && precioARS > 0) return precioARS;
      const precioUSD = precios[ticker];
      if (precioUSD && precioUSD > 0) return precioUSD * ccl;
      return precio_compra;
    }
    if (categoria === 'byma') {
      const precioARS = precios[`${ticker}.BA`] ?? precios[ticker];
      return precioARS && precioARS > 0 ? precioARS : precio_compra;
    }
    return precios[ticker] ?? precio_compra;
  };

  const convertir = (valor: number, categoria: string): number => {
    if (modoMoneda === 'USD') {
      if (CATS_ARS.includes(categoria) || categoria === 'cedear') return valor / ccl;
      return valor;
    } else {
      if (CATS_USD.includes(categoria)) return valor * ccl;
      return valor;
    }
  };

  const formatVal = (valor: number): string =>
    modoMoneda === 'ARS'
      ? `$ ${valor.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
      : `u$s ${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const etiquetaOriginal = (categoria: string): string | null => {
    if (modoMoneda === 'USD' && [...CATS_ARS, 'cedear'].includes(categoria)) return 'ARS';
    if (modoMoneda === 'ARS' && CATS_USD.includes(categoria)) return 'USD';
    return null;
  };

  const totalInvertido = posicionesAgrupadas.reduce((s, p) => s + p.cantidadTotal * convertir(p.ppc, p.categoria), 0);
  const totalActual = posicionesAgrupadas.reduce((s, p) => s + p.cantidadTotal * convertir(getPrecioActual(p.ticker, p.categoria, p.ppc), p.categoria), 0);
  const ganancia = totalActual - totalInvertido;
  const gananciaPct = totalInvertido > 0 ? (ganancia / totalInvertido) * 100 : 0;
  const positivo = ganancia >= 0;

  function onChangeTicker(t: string) { const val = t.toUpperCase(); setTicker(val); setSugerencias(buscarTickers(val)); }
  function seleccionarSugerencia(s: TickerSugerido) {
    setTicker(s.ticker); setNombre(s.nombre); setCategoriaSeleccionada(s.categoria); setMoneda(s.moneda);
    setSugerencias([]); Keyboard.dismiss();
  }

  function abrirEditar(pos: Posicion) {
    setPosEditando(pos); setEditNombre(pos.nombre); setEditCantidad(pos.cantidad.toString());
    setEditPrecioCompra(pos.precio_compra.toString()); setEditCategoria(pos.categoria); setEditMoneda(pos.moneda);
    setMenuPos(null); setMenuSubPosVisible(false); setModalEditarVisible(true);
  }

  async function guardarEdicion() {
    if (!editCantidad || !editPrecioCompra) { Alert.alert('Error', 'Completá cantidad y precio de compra'); return; }
    setGuardando(true);
    const { error } = await supabase.from('posiciones').update({
      nombre: editNombre || posEditando!.ticker, cantidad: parseFloat(editCantidad),
      precio_compra: parseFloat(editPrecioCompra), categoria: editCategoria, moneda: editMoneda,
    }).eq('id', posEditando!.id);
    if (error) Alert.alert('Error', error.message);
    else { setModalEditarVisible(false); cargarDatos(); }
    setGuardando(false);
  }

  async function agregarPosicion() {
    if (!ticker || !cantidad || !precioCompra) { Alert.alert('Error', 'Completá ticker, cantidad y precio de compra'); return; }
    const fechaISO = inputAFecha(fechaCompra);
    if (!fechaISO) { Alert.alert('Error', 'Fecha inválida. Usá el formato DD/MM/AAAA'); return; }
    setGuardando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGuardando(false); return; }
    const { error } = await supabase.from('posiciones').insert({
      usuario_id: user.id, ticker: ticker.toUpperCase(), nombre: nombre || ticker.toUpperCase(),
      categoria: categoriaSeleccionada, cantidad: parseFloat(cantidad),
      precio_compra: parseFloat(precioCompra), moneda, fecha_compra: fechaISO,
    });
    if (!error) {
      const tipoOp = categoriaSeleccionada === 'fci' ? 'SUSCRIPCION_FCI' : 'COMPRA';
      await supabase.from('operaciones').insert({
        usuario_id: user.id, ticker: ticker.toUpperCase(), tipo: tipoOp,
        cantidad: parseFloat(cantidad), precio: parseFloat(precioCompra),
        comision: 0, moneda, fecha: fechaISO, notas: 'Agregado desde cartera',
      });
      setModalVisible(false);
      setTicker(''); setNombre(''); setCantidad(''); setPrecioCompra('');
      setFechaCompra(fechaAInput(new Date().toISOString().split('T')[0]));
      setSugerencias([]); cargarDatos();
    } else Alert.alert('Error', error.message);
    setGuardando(false);
  }

  async function eliminarPosicion(pos: Posicion) {
    setMenuPos(null); setMenuSubPosVisible(false);
    Alert.alert('Eliminar posición', `¿Eliminar ${pos.ticker} (${pos.cantidad} u.)?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('posiciones').delete().eq('id', pos.id);
        if (error) Alert.alert('Error', error.message);
        else { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); cargarDatos(); }
      }}
    ]);
  }

  const saludoHora = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.saludo}>{saludoHora()},</Text>
          <Text style={styles.nombreUsuario}>{nombreUsuario || 'Inversor'} 👋</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={styles.toggleMoneda}>
            <TouchableOpacity style={[styles.toggleBtn, modoMoneda === 'ARS' && { backgroundColor: theme.gold }]} onPress={() => setModoMoneda('ARS')}>
              <Text style={[styles.toggleBtnTexto, modoMoneda === 'ARS' && { color: '#000' }]}>ARS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, modoMoneda === 'USD' && { backgroundColor: theme.green }]} onPress={() => setModoMoneda('USD')}>
              <Text style={[styles.toggleBtnTexto, modoMoneda === 'USD' && { color: '#000' }]}>USD</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.perfilBoton} onPress={() => router.push('/perfil')}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.green} /></View>
      ) : (
        <>
          {/* ── RESUMEN TOTAL + GRÁFICO ── */}
          <View style={styles.graficoCard}>
            <Text style={styles.totalLabel}>VALOR TOTAL · {modoMoneda}</Text>
            <Text style={styles.totalValor}>{formatVal(totalActual)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={[styles.variacionBadge, { backgroundColor: positivo ? theme.greenDim : theme.redDim }]}>
                <Text style={[styles.variacionTexto, { color: positivo ? theme.green : theme.red }]}>
                  {positivo ? '+' : ''}{gananciaPct.toFixed(2)}%{'  '}{positivo ? '+' : ''}{formatVal(Math.abs(ganancia))}
                </Text>
              </View>
              {modoMoneda === 'USD' && <Text style={styles.cclTexto}>CCL ${ccl.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>}
            </View>

            {/* Gráfico */}
            {cargandoGrafico ? (
              <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                <ActivityIndicator size="small" color={theme.green} />
              </View>
            ) : datosGrafico.length > 1 ? (
              <GraficoCartera datos={datosGrafico} positivo={positivo} theme={theme} />
            ) : null}

            {/* Selector de período */}
            <View style={styles.periodoRow}>
              {PERIODOS.map(p => (
                <TouchableOpacity key={p} style={[styles.periodoBtn, periodoActivo === p && { backgroundColor: theme.green }]}
                  onPress={() => setPeriodoActivo(p)}>
                  <Text style={[styles.periodoBtnTexto, periodoActivo === p && { color: '#000' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── TARJETAS ── */}
          <View style={styles.tarjetasRow}>
            <View style={styles.tarjeta}><Text style={styles.tarjetaLabel}>Invertido</Text><Text style={styles.tarjetaValor} numberOfLines={1}>{formatVal(totalInvertido)}</Text></View>
            <View style={styles.tarjeta}><Text style={styles.tarjetaLabel}>Activos</Text><Text style={[styles.tarjetaValor, { color: theme.blue }]}>{posicionesAgrupadas.length}</Text></View>
            <View style={styles.tarjeta}><Text style={styles.tarjetaLabel}>G/P</Text><Text style={[styles.tarjetaValor, { color: positivo ? theme.green : theme.red }]} numberOfLines={1}>{positivo ? '+' : ''}{formatVal(Math.abs(ganancia))}</Text></View>
          </View>

          {/* ── MIS ACTIVOS ── */}
          <View style={styles.seccionHeaderRow}>
            <Text style={styles.seccionTituloInline}>Mis Activos</Text>
            <TouchableOpacity style={styles.seccionBotonPlus} onPress={() => setModalVisible(true)}>
              <Text style={styles.seccionBotonPlusTexto}>+</Text>
            </TouchableOpacity>
          </View>

          {posicionesAgrupadas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexto}>No tenés posiciones todavía</Text>
              <TouchableOpacity style={styles.botonAgregarEmpty} onPress={() => setModalVisible(true)}>
                <Text style={styles.botonAgregarTexto}>+ Agregar primera posición</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tabla}>
              {posicionesAgrupadas.map((pos, i) => {
                const precioActual = getPrecioActual(pos.ticker, pos.categoria, pos.ppc);
                const precioConv = convertir(precioActual, pos.categoria);
                const ppcConv = convertir(pos.ppc, pos.categoria);
                const valorActual = pos.cantidadTotal * precioConv;
                const gp = valorActual - pos.cantidadTotal * ppcConv;
                const gpPct = pos.ppc > 0 ? ((precioActual - pos.ppc) / pos.ppc) * 100 : 0;
                const esPositivo = gp >= 0;
                const cat = CATEGORIAS.find(c => c.id === pos.categoria);
                const etiq = etiquetaOriginal(pos.categoria);
                const spark = sparklines[pos.ticker];
                const pct = totalActual > 0 ? (valorActual / totalActual) * 100 : 0;
                return (
                  <View key={pos.ticker} style={[styles.fila, i === posicionesAgrupadas.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.filaIcono, { backgroundColor: (cat?.color ?? theme.green) + '22' }]}>
                      <Text style={[styles.filaIconoTexto, { color: cat?.color ?? theme.green }]}>{pos.ticker[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filaTicker}>{pos.ticker}</Text>
                      <Text style={styles.filaNombre}>{pos.nombre}</Text>
                      <Text style={styles.filaCantidad}>{pos.cantidadTotal} u. · PPC ${pos.ppc.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</Text>
                    </View>
                    {/* Sparkline */}
                    {spark && (
                      <Sparkline data={spark} color={esPositivo ? '#00D26A' : '#FF4D4D'} width={52} height={28} />
                    )}
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={styles.filaValor}>{formatVal(valorActual)}</Text>
                      <Text style={[styles.filaGP, { color: esPositivo ? theme.green : theme.red }]}>{esPositivo ? '+' : ''}{gpPct.toFixed(2)}%</Text>
                      <Text style={styles.filaPct}>{pct.toFixed(1)}%</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setMenuPos(pos); setMenuSubPosVisible(false); }} style={styles.menuBoton}>
                      <Text style={styles.menuPuntos}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity style={styles.verRendimientoBoton} onPress={() => router.push('/rendimiento')}>
            <Text style={styles.verRendimientoTexto}>Ver rendimiento completo →</Text>
          </TouchableOpacity>
        </>
      )}

      {/* MODAL AGREGAR */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => { Keyboard.dismiss(); setSugerencias([]); }} style={styles.modalOverlay}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitulo}>Agregar posición</Text>
                  <TouchableOpacity onPress={() => { setModalVisible(false); setSugerencias([]); }}><Text style={styles.modalCerrar}>✕</Text></TouchableOpacity>
                </View>
                <TextInput style={styles.input} placeholder="Ticker (ej: GGAL, AAPL, GD30)" placeholderTextColor={theme.gray} value={ticker} onChangeText={onChangeTicker} autoCapitalize="characters" returnKeyType="next" onSubmitEditing={() => refNombre.current?.focus()} blurOnSubmit={false} />
                {sugerencias.length > 0 && (
                  <View style={styles.sugerenciasContainer}>
                    {sugerencias.map((s, i) => (
                      <TouchableOpacity key={s.ticker} style={[styles.sugerenciaFila, i === sugerencias.length - 1 && { borderBottomWidth: 0 }]} onPress={() => seleccionarSugerencia(s)}>
                        <View style={[styles.sugerenciaIcono, { backgroundColor: COLORES_CATEGORIA[s.categoria] + '22' }]}><Text style={[styles.sugerenciaLetra, { color: COLORES_CATEGORIA[s.categoria] }]}>{s.ticker[0]}</Text></View>
                        <View style={{ flex: 1 }}><Text style={styles.sugerenciaTicker}>{s.ticker}</Text><Text style={styles.sugerenciaNombre}>{s.nombre}</Text></View>
                        <Text style={[styles.sugerenciaCategoria, { color: COLORES_CATEGORIA[s.categoria] }]}>{s.categoria.replace('_', ' ').toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TextInput style={styles.input} placeholder="Nombre (opcional)" placeholderTextColor={theme.gray} value={nombre} onChangeText={setNombre} ref={refNombre} returnKeyType="next" onSubmitEditing={() => refCantidad.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Cantidad / VN" placeholderTextColor={theme.gray} value={cantidad} onChangeText={setCantidad} keyboardType="numeric" ref={refCantidad} returnKeyType="next" onSubmitEditing={() => refPrecio.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Precio de compra" placeholderTextColor={theme.gray} value={precioCompra} onChangeText={setPrecioCompra} keyboardType="numeric" ref={refPrecio} returnKeyType="next" onSubmitEditing={() => refFechaCompra.current?.focus()} blurOnSubmit={false} />
                <Text style={styles.inputLabel}>Fecha de adquisición</Text>
                <TextInput style={styles.input} placeholder="DD/MM/AAAA" placeholderTextColor={theme.gray} value={fechaCompra} onChangeText={t => setFechaCompra(formatearFechaInput(t))} keyboardType="numeric" ref={refFechaCompra} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                <Text style={styles.inputLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {CATEGORIAS.map(cat => (
                    <TouchableOpacity key={cat.id} style={[styles.catBoton, categoriaSeleccionada === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]} onPress={() => setCategoriaSeleccionada(cat.id)}>
                      <Text style={[styles.catTexto, categoriaSeleccionada === cat.id && { color: '#000' }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.inputLabel}>Moneda</Text>
                <View style={styles.monedaRow}>
                  {['ARS', 'USD'].map(m => (
                    <TouchableOpacity key={m} style={[styles.monedaBoton, moneda === m && { backgroundColor: theme.green, borderColor: theme.green }]} onPress={() => setMoneda(m)}>
                      <Text style={[styles.monedaTexto, moneda === m && { color: '#000' }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.botonGuardar} onPress={agregarPosicion} disabled={guardando}>
                  {guardando ? <ActivityIndicator color="#000" /> : <Text style={styles.botonGuardarTexto}>Guardar posición</Text>}
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal visible={modalEditarVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => Keyboard.dismiss()} style={styles.modalOverlay}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitulo}>Modificar {posEditando?.ticker}</Text>
                  <TouchableOpacity onPress={() => setModalEditarVisible(false)}><Text style={styles.modalCerrar}>✕</Text></TouchableOpacity>
                </View>
                {posEditando?.fecha_compra && <Text style={[styles.inputLabel, { marginBottom: 12, color: theme.gray }]}>📅 Compra del {fechaAInput(posEditando.fecha_compra)}</Text>}
                <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={theme.gray} value={editNombre} onChangeText={setEditNombre} returnKeyType="next" onSubmitEditing={() => refEditCantidad.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Cantidad / VN" placeholderTextColor={theme.gray} value={editCantidad} onChangeText={setEditCantidad} keyboardType="numeric" ref={refEditCantidad} returnKeyType="next" onSubmitEditing={() => refEditPrecio.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Precio de compra" placeholderTextColor={theme.gray} value={editPrecioCompra} onChangeText={setEditPrecioCompra} keyboardType="numeric" ref={refEditPrecio} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                <Text style={styles.inputLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {CATEGORIAS.map(cat => (
                    <TouchableOpacity key={cat.id} style={[styles.catBoton, editCategoria === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]} onPress={() => setEditCategoria(cat.id)}>
                      <Text style={[styles.catTexto, editCategoria === cat.id && { color: '#000' }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.inputLabel}>Moneda</Text>
                <View style={styles.monedaRow}>
                  {['ARS', 'USD'].map(m => (
                    <TouchableOpacity key={m} style={[styles.monedaBoton, editMoneda === m && { backgroundColor: theme.green, borderColor: theme.green }]} onPress={() => setEditMoneda(m)}>
                      <Text style={[styles.monedaTexto, editMoneda === m && { color: '#000' }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.botonGuardar} onPress={guardarEdicion} disabled={guardando}>
                  {guardando ? <ActivityIndicator color="#000" /> : <Text style={styles.botonGuardarTexto}>Guardar cambios</Text>}
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL MENU */}
      <Modal visible={!!menuPos} animationType="fade" transparent>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => { setMenuPos(null); setMenuSubPosVisible(false); }}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTicker}>{menuPos?.ticker}</Text>
            <Text style={styles.menuNombre}>{menuPos?.nombre}</Text>
            {menuPos && menuPos.subPosiciones.length > 1 && (
              <TouchableOpacity style={[styles.menuOpcion, { marginBottom: 4 }]} onPress={() => setMenuSubPosVisible(!menuSubPosVisible)}>
                <Text style={styles.menuOpcionIcono}>📋</Text>
                <Text style={styles.menuOpcionTexto}>{menuSubPosVisible ? 'Ocultar compras' : `Ver ${menuPos.subPosiciones.length} compras`}</Text>
                <Text style={styles.menuOpcionFlecha}>{menuSubPosVisible ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            )}
            {menuSubPosVisible && menuPos && menuPos.subPosiciones.map((sub) => (
              <View key={sub.id} style={styles.subPosContainer}>
                <View style={{ flex: 1 }}><Text style={styles.subPosTexto}>{sub.cantidad} u. · ${sub.precio_compra.toLocaleString('es-AR')}</Text><Text style={styles.subPosFecha}>{fechaAInput(sub.fecha_compra)}</Text></View>
                <TouchableOpacity onPress={() => abrirEditar(sub)} style={styles.subPosBoton}><Text style={{ color: theme.blue, fontSize: 12, fontWeight: '600' }}>Editar</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => eliminarPosicion(sub)} style={styles.subPosBoton}><Text style={{ color: theme.red, fontSize: 12, fontWeight: '600' }}>Eliminar</Text></TouchableOpacity>
              </View>
            ))}
            {menuPos && menuPos.subPosiciones.length === 1 && (
              <TouchableOpacity style={styles.menuOpcion} onPress={() => abrirEditar(menuPos.subPosiciones[0])}>
                <Text style={styles.menuOpcionIcono}>✏️</Text><Text style={styles.menuOpcionTexto}>Modificar datos</Text><Text style={styles.menuOpcionFlecha}>›</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuOpcion} onPress={() => {
              const precioActual = getPrecioActual(menuPos!.ticker, menuPos!.categoria, menuPos!.ppc);
              const gpPct = menuPos!.ppc > 0 ? ((precioActual - menuPos!.ppc) / menuPos!.ppc) * 100 : 0;
              setMenuPos(null); setMenuSubPosVisible(false);
              router.push({ pathname: '/detalle', params: { ticker: menuPos!.ticker, nombre: menuPos!.nombre, precioActual: precioActual.toString(), gpPct: gpPct.toString(), categoria: menuPos!.categoria, cantidad: menuPos!.cantidadTotal.toString(), precioCompra: menuPos!.ppc.toString() }});
            }}>
              <Text style={styles.menuOpcionIcono}>📈</Text><Text style={styles.menuOpcionTexto}>Ver rendimiento</Text><Text style={styles.menuOpcionFlecha}>›</Text>
            </TouchableOpacity>
            {menuPos && menuPos.subPosiciones.length === 1 && (
              <><View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuOpcion} onPress={() => eliminarPosicion(menuPos.subPosiciones[0])}>
                <Text style={styles.menuOpcionIcono}>🗑️</Text><Text style={[styles.menuOpcionTexto, { color: theme.red }]}>Eliminar posición</Text><Text style={styles.menuOpcionFlecha}>›</Text>
              </TouchableOpacity></>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 8 },
  saludo: { color: theme.gray, fontSize: 13 },
  nombreUsuario: { color: theme.white, fontSize: 22, fontWeight: '800', marginTop: 2 },
  perfilBoton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  toggleMoneda: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 20, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  toggleBtnTexto: { fontSize: 12, fontWeight: '800', color: theme.gray },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  // Gráfico card
  graficoCard: { backgroundColor: theme.card, borderRadius: 20, marginHorizontal: 20, marginTop: 16, marginBottom: 16, padding: 20, borderWidth: 1, borderColor: theme.border },
  totalLabel: { color: theme.gray, fontSize: 11, letterSpacing: 1 },
  totalValor: { color: theme.white, fontSize: 34, fontWeight: '800', marginTop: 4 },
  variacionBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  variacionTexto: { fontSize: 12, fontWeight: '700' },
  cclTexto: { color: theme.gray, fontSize: 11 },
  periodoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  periodoBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  periodoBtnTexto: { color: theme.gray, fontSize: 12, fontWeight: '600' },
  // Tarjetas
  tarjetasRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  tarjeta: { flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  tarjetaLabel: { color: theme.gray, fontSize: 10 },
  tarjetaValor: { color: theme.white, fontSize: 13, fontWeight: '700', marginTop: 4 },
  // Sección
  seccionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  seccionTituloInline: { color: theme.white, fontSize: 16, fontWeight: '700' },
  seccionBotonPlus: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center' },
  seccionBotonPlusTexto: { color: '#000', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  emptyContainer: { alignItems: 'center', marginTop: 40, gap: 16 },
  emptyTexto: { color: theme.gray, fontSize: 14 },
  botonAgregarEmpty: { backgroundColor: theme.green, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  botonAgregarTexto: { color: '#000', fontWeight: '700', fontSize: 13 },
  // Tabla activos
  tabla: { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  filaIcono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  filaIconoTexto: { fontWeight: '800', fontSize: 15 },
  filaTicker: { color: theme.white, fontWeight: '700', fontSize: 14 },
  filaNombre: { color: theme.lgray, fontSize: 10, marginTop: 1 },
  filaCantidad: { color: theme.gray, fontSize: 9, marginTop: 1 },
  filaValor: { color: theme.white, fontWeight: '700', fontSize: 13 },
  filaGP: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  filaPct: { color: theme.gray, fontSize: 9, marginTop: 1 },
  menuBoton: { padding: 8 },
  menuPuntos: { color: theme.gray, fontSize: 20, fontWeight: '700' },
  verRendimientoBoton: { marginHorizontal: 20, marginBottom: 30, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.green + '55', alignItems: 'center' },
  verRendimientoTexto: { color: theme.green, fontSize: 13, fontWeight: '600' },
  // Modales
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { color: theme.white, fontSize: 18, fontWeight: '700' },
  modalCerrar: { color: theme.gray, fontSize: 20 },
  input: { backgroundColor: theme.card2, borderRadius: 10, padding: 14, color: theme.white, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  inputLabel: { color: theme.lgray, fontSize: 12, marginBottom: 8 },
  catBoton: { backgroundColor: theme.card2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  catTexto: { color: theme.lgray, fontSize: 12, fontWeight: '600' },
  monedaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  monedaBoton: { flex: 1, backgroundColor: theme.card2, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  monedaTexto: { color: theme.lgray, fontWeight: '700' },
  botonGuardar: { backgroundColor: theme.green, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  botonGuardarTexto: { color: '#000', fontWeight: '800', fontSize: 15 },
  menuOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', paddingHorizontal: 40 },
  menuContainer: { backgroundColor: theme.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.border },
  menuTicker: { color: theme.white, fontSize: 18, fontWeight: '800', marginBottom: 2 },
  menuNombre: { color: theme.gray, fontSize: 12, marginBottom: 16 },
  menuOpcion: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  menuOpcionIcono: { fontSize: 20 },
  menuOpcionTexto: { flex: 1, color: theme.white, fontSize: 15, fontWeight: '600' },
  menuOpcionFlecha: { color: theme.gray, fontSize: 18 },
  menuDivider: { height: 1, backgroundColor: theme.border, marginVertical: 4 },
  subPosContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4 },
  subPosTexto: { color: theme.white, fontSize: 12, fontWeight: '600' },
  subPosFecha: { color: theme.gray, fontSize: 10, marginTop: 2 },
  subPosBoton: { paddingHorizontal: 8, paddingVertical: 4 },
  sugerenciasContainer: { backgroundColor: theme.card2, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  sugerenciaFila: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 10 },
  sugerenciaIcono: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sugerenciaLetra: { fontWeight: '800', fontSize: 14 },
  sugerenciaTicker: { color: theme.white, fontWeight: '700', fontSize: 13 },
  sugerenciaNombre: { color: theme.gray, fontSize: 11, marginTop: 1 },
  sugerenciaCategoria: { fontSize: 10, fontWeight: '700' },
});
