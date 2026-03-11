import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { buscarTickers, COLORES_CATEGORIA, type TickerSugerido } from '@/lib/tickers';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';

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

// ── CORRELACIÓN POR CATEGORÍA (fallback) ─────────────
const CORREL_CATEGORIAS: Record<string, Record<string, number>> = {
  cedear:   { cedear: 1.00, nasdaq: 0.85, byma: 0.55, crypto: 0.25, bono_ars: -0.10, bono_usd: 0.20, letra: -0.05, on: 0.10, fci: 0.05 },
  nasdaq:   { cedear: 0.85, nasdaq: 1.00, byma: 0.50, crypto: 0.30, bono_ars: -0.15, bono_usd: 0.25, letra: -0.05, on: 0.15, fci: 0.05 },
  byma:     { cedear: 0.55, nasdaq: 0.50, byma: 1.00, crypto: 0.20, bono_ars: 0.10,  bono_usd: 0.15, letra: 0.05,  on: 0.20, fci: 0.10 },
  crypto:   { cedear: 0.25, nasdaq: 0.30, byma: 0.20, crypto: 1.00, bono_ars: -0.05, bono_usd: 0.10, letra: -0.05, on: 0.05, fci: 0.00 },
  bono_ars: { cedear: -0.10, nasdaq: -0.15, byma: 0.10, crypto: -0.05, bono_ars: 1.00, bono_usd: 0.30, letra: 0.80, on: 0.40, fci: 0.60 },
  bono_usd: { cedear: 0.20, nasdaq: 0.25, byma: 0.15, crypto: 0.10, bono_ars: 0.30, bono_usd: 1.00, letra: 0.20, on: 0.50, fci: 0.20 },
  letra:    { cedear: -0.05, nasdaq: -0.05, byma: 0.05, crypto: -0.05, bono_ars: 0.80, bono_usd: 0.20, letra: 1.00, on: 0.35, fci: 0.70 },
  on:       { cedear: 0.10, nasdaq: 0.15, byma: 0.20, crypto: 0.05, bono_ars: 0.40, bono_usd: 0.50, letra: 0.35, on: 1.00, fci: 0.30 },
  fci:      { cedear: 0.05, nasdaq: 0.05, byma: 0.10, crypto: 0.00, bono_ars: 0.60, bono_usd: 0.20, letra: 0.70, on: 0.30, fci: 1.00 },
};

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return NaN;
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : Math.max(-1, Math.min(1, num / den));
}

function calcularRetornos(closes: number[]): number[] {
  const retornos: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) retornos.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return retornos;
}

function getYFTicker(pos: Posicion): string {
  if (pos.categoria === 'crypto') {
    const mapa: Record<string, string> = { BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', ADA: 'ADA-USD', USDT: 'USDT-USD' };
    return mapa[pos.ticker] ?? `${pos.ticker}-USD`;
  }
  if (['byma', 'bono_ars', 'letra', 'on'].includes(pos.categoria)) return `${pos.ticker}.BA`;
  return pos.ticker;
}

function getCorrelColor(val: number): string {
  if (isNaN(val)) return '#333333';
  if (val >= 0.7)  return '#006633';
  if (val >= 0.4)  return '#00A64F';
  if (val >= 0.1)  return '#4DC98A';
  if (val >= -0.1) return '#444444';
  if (val >= -0.4) return '#C97A4D';
  if (val >= -0.7) return '#D94F4F';
  return '#AA0000';
}

function getCorrelLabel(val: number): string {
  if (isNaN(val)) return '—';
  if (val >= 0.7)  return 'Alta ↑';
  if (val >= 0.4)  return 'Mod ↑';
  if (val >= 0.1)  return 'Baja ↑';
  if (val >= -0.1) return 'Neutra';
  if (val >= -0.4) return 'Baja ↓';
  if (val >= -0.7) return 'Mod ↓';
  return 'Alta ↓';
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

export default function Cartera() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [menuPos, setMenuPos] = useState<Posicion | null>(null);
  const [modoMoneda, setModoMoneda] = useState<'ARS' | 'USD'>('ARS');

  // Correlación
  const [correlaciones, setCorrelaciones] = useState<number[][]>([]);
  const [tickersCorrel, setTickersCorrel] = useState<string[]>([]);
  const [cargandoCorrel, setCargandoCorrel] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [fuentesCorrel, setFuentesCorrel] = useState<Record<string, 'yahoo' | 'categoria'>>({});

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
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
    const show = Keyboard.addListener('keyboardWillShow', () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut));
    const hide = Keyboard.addListener('keyboardWillHide', () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut));
    return () => { show.remove(); hide.remove(); };
  }, []);

  async function cargarDatos() {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: pos }, { data: prec }] = await Promise.all([
      supabase.from('posiciones').select('*').eq('usuario_id', user.id),
      supabase.from('precios_cache').select('ticker, precio'),
    ]);
    if (pos) setPosiciones(pos);
    if (prec) {
      const mapa: Record<string, number> = {};
      prec.forEach(p => { mapa[p.ticker] = p.precio; });
      setPrecios(mapa);
    }
    setCargando(false);
  }

  useEffect(() => { cargarDatos(); }, []);

  async function cargarCorrelaciones(pos: Posicion[]) {
    if (pos.length < 2) return;
    setCargandoCorrel(true);

    // Máximo 8 activos ordenados por valor invertido
    const activos = [...pos]
      .sort((a, b) => (b.cantidad * b.precio_compra) - (a.cantidad * a.precio_compra))
      .slice(0, 8);

    const retornosMap: Record<string, number[]> = {};
    const fuentes: Record<string, 'yahoo' | 'categoria'> = {};

    await Promise.all(activos.map(async (p) => {
      try {
        const yfTicker = getYFTicker(p);
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yfTicker}?interval=1d&range=3mo`);
        const json = await res.json();
        const closes: number[] = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
          .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
        if (closes.length >= 10) {
          retornosMap[p.ticker] = calcularRetornos(closes);
          fuentes[p.ticker] = 'yahoo';
        } else {
          fuentes[p.ticker] = 'categoria';
        }
      } catch {
        fuentes[p.ticker] = 'categoria';
      }
    }));

    const tickers = activos.map(p => p.ticker);
    const n = tickers.length;
    const matriz: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) { matriz[i][j] = 1.0; continue; }
        const retI = retornosMap[tickers[i]];
        const retJ = retornosMap[tickers[j]];
        if (retI && retJ && retI.length >= 10 && retJ.length >= 10) {
          matriz[i][j] = pearsonCorrelation(retI, retJ);
        } else {
          const catI = activos[i].categoria;
          const catJ = activos[j].categoria;
          matriz[i][j] = CORREL_CATEGORIAS[catI]?.[catJ] ?? 0;
        }
      }
    }

    setTickersCorrel(tickers);
    setCorrelaciones(matriz);
    setFuentesCorrel(fuentes);
    setCargandoCorrel(false);
  }

  function onChangeTicker(t: string) {
    const val = t.toUpperCase();
    setTicker(val);
    setSugerencias(buscarTickers(val));
  }

  function seleccionarSugerencia(s: TickerSugerido) {
    setTicker(s.ticker);
    setNombre(s.nombre);
    setCategoriaSeleccionada(s.categoria);
    setMoneda(s.moneda);
    setSugerencias([]);
    Keyboard.dismiss();
  }

  function abrirEditar(pos: Posicion) {
    setPosEditando(pos);
    setEditNombre(pos.nombre);
    setEditCantidad(pos.cantidad.toString());
    setEditPrecioCompra(pos.precio_compra.toString());
    setEditCategoria(pos.categoria);
    setEditMoneda(pos.moneda);
    setMenuPos(null);
    setModalEditarVisible(true);
  }

  async function guardarEdicion() {
    if (!editCantidad || !editPrecioCompra) {
      Alert.alert('Error', 'Completá cantidad y precio de compra');
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from('posiciones').update({
      nombre: editNombre || posEditando!.ticker,
      cantidad: parseFloat(editCantidad),
      precio_compra: parseFloat(editPrecioCompra),
      categoria: editCategoria,
      moneda: editMoneda,
    }).eq('id', posEditando!.id);
    if (error) Alert.alert('Error', error.message);
    else { setModalEditarVisible(false); cargarDatos(); }
    setGuardando(false);
  }

  async function agregarPosicion() {
    if (!ticker || !cantidad || !precioCompra) {
      Alert.alert('Error', 'Completá ticker, cantidad y precio de compra');
      return;
    }
    const fechaISO = inputAFecha(fechaCompra);
    if (!fechaISO) {
      Alert.alert('Error', 'Fecha inválida. Usá el formato DD/MM/AAAA');
      return;
    }
    setGuardando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGuardando(false); return; }

    const { error } = await supabase.from('posiciones').insert({
      usuario_id: user.id,
      ticker: ticker.toUpperCase(),
      nombre: nombre || ticker.toUpperCase(),
      categoria: categoriaSeleccionada,
      cantidad: parseFloat(cantidad),
      precio_compra: parseFloat(precioCompra),
      moneda,
      fecha_compra: fechaISO,
    });

    if (!error) {
      const tipoOp = categoriaSeleccionada === 'fci' ? 'SUSCRIPCION_FCI' : 'COMPRA';
      await supabase.from('operaciones').insert({
        usuario_id: user.id,
        ticker: ticker.toUpperCase(),
        tipo: tipoOp,
        cantidad: parseFloat(cantidad),
        precio: parseFloat(precioCompra),
        comision: 0,
        moneda,
        fecha: fechaISO,
        notas: 'Agregado desde cartera',
      });
      setModalVisible(false);
      setTicker(''); setNombre(''); setCantidad(''); setPrecioCompra('');
      setFechaCompra(fechaAInput(new Date().toISOString().split('T')[0]));
      setSugerencias([]);
      setCorrelaciones([]); // resetear correlaciones al agregar nuevo activo
      cargarDatos();
    } else {
      Alert.alert('Error', error.message);
    }
    setGuardando(false);
  }

  async function eliminarPosicion(pos: Posicion) {
    setMenuPos(null);
    Alert.alert(
      'Eliminar posición',
      `¿Querés eliminar ${pos.ticker} de tu cartera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('posiciones').delete().eq('id', pos.id);
            if (error) Alert.alert('Error', error.message);
            else {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setCorrelaciones([]);
              cargarDatos();
            }
          }
        }
      ]
    );
  }

  const ccl = precios['CCL'] ?? 1285;

  const getPrecioActual = (pos: Posicion): number => {
    if (pos.categoria === 'cedear') {
      const precioARS = precios[`${pos.ticker}.BA`];
      if (precioARS && precioARS > 0) return precioARS;
      const precioUSD = precios[pos.ticker];
      if (precioUSD && precioUSD > 0) return precioUSD * ccl;
      return pos.precio_compra;
    }
    if (pos.categoria === 'byma') {
      const precioARS = precios[`${pos.ticker}.BA`] ?? precios[pos.ticker];
      return precioARS && precioARS > 0 ? precioARS : pos.precio_compra;
    }
    return precios[pos.ticker] ?? pos.precio_compra;
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

  const totalInvertido = posiciones.reduce((s, p) => s + p.cantidad * convertir(p.precio_compra, p.categoria), 0);
  const totalActual = posiciones.reduce((s, p) => s + p.cantidad * convertir(getPrecioActual(p), p.categoria), 0);
  const ganancia = totalActual - totalInvertido;
  const gananciaPct = totalInvertido > 0 ? (ganancia / totalInvertido) * 100 : 0;
  const positivo = ganancia >= 0;

  const CELL_SIZE = 52;

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>Mi Cartera 💼</Text>
          <Text style={styles.appNombre}>A Contar</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={styles.toggleMoneda}>
            <TouchableOpacity
              style={[styles.toggleBtn, modoMoneda === 'ARS' && { backgroundColor: theme.gold }]}
              onPress={() => setModoMoneda('ARS')}>
              <Text style={[styles.toggleBtnTexto, modoMoneda === 'ARS' && { color: '#000' }]}>ARS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, modoMoneda === 'USD' && { backgroundColor: theme.green }]}
              onPress={() => setModoMoneda('USD')}>
              <Text style={[styles.toggleBtnTexto, modoMoneda === 'USD' && { color: '#000' }]}>USD</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
            <Text style={styles.botonAgregarTexto}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      ) : (
        <>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>VALOR TOTAL · {modoMoneda}</Text>
            <Text style={styles.totalValor}>{formatVal(totalActual)}</Text>
            <View style={[styles.variacionBadge, { backgroundColor: positivo ? theme.greenDim : theme.redDim }]}>
              <Text style={[styles.variacionTexto, { color: positivo ? theme.green : theme.red }]}>
                {positivo ? '+' : ''}{gananciaPct.toFixed(2)}%
                {'  '}({positivo ? '+' : ''}{formatVal(Math.abs(ganancia))})
              </Text>
            </View>
            {modoMoneda === 'USD' && (
              <Text style={styles.cclTexto}>CCL: ${ccl.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>
            )}
            <TouchableOpacity style={styles.verRendimientoBoton} onPress={() => router.push('/rendimiento')}>
              <Text style={styles.verRendimientoTexto}>Ver rendimiento →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tarjetasRow}>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>Invertido</Text>
              <Text style={styles.tarjetaValor} numberOfLines={1}>{formatVal(totalInvertido)}</Text>
            </View>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>Activos</Text>
              <Text style={[styles.tarjetaValor, { color: theme.blue }]}>{posiciones.length}</Text>
            </View>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>G/P</Text>
              <Text style={[styles.tarjetaValor, { color: positivo ? theme.green : theme.red }]} numberOfLines={1}>
                {positivo ? '+' : ''}{formatVal(Math.abs(ganancia))}
              </Text>
            </View>
          </View>

          <Text style={styles.seccionTitulo}>Mis Posiciones</Text>

          {posiciones.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexto}>No tenés posiciones todavía</Text>
              <TouchableOpacity style={styles.botonAgregarEmpty} onPress={() => setModalVisible(true)}>
                <Text style={styles.botonAgregarTexto}>+ Agregar primera posición</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tabla}>
              {posiciones.map((pos, i) => {
                const precioActual = getPrecioActual(pos);
                const precioConv = convertir(precioActual, pos.categoria);
                const precioCompraConv = convertir(pos.precio_compra, pos.categoria);
                const valorActual = pos.cantidad * precioConv;
                const gp = valorActual - pos.cantidad * precioCompraConv;
                const gpPct = pos.precio_compra > 0 ? ((precioActual - pos.precio_compra) / pos.precio_compra) * 100 : 0;
                const esPositivo = gp >= 0;
                const cat = CATEGORIAS.find(c => c.id === pos.categoria);
                const etiq = etiquetaOriginal(pos.categoria);
                return (
                  <View key={pos.id} style={[styles.fila, i === posiciones.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.filaIcono, { backgroundColor: (cat?.color ?? theme.green) + '22' }]}>
                      <Text style={[styles.filaIconoTexto, { color: cat?.color ?? theme.green }]}>
                        {pos.ticker[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filaTicker}>{pos.ticker}</Text>
                      <Text style={styles.filaNombre}>{pos.nombre}</Text>
                      <Text style={styles.filaCantidad}>
                        {pos.cantidad} u. · P.compra $ {pos.precio_compra.toLocaleString('es-AR')}
                        {pos.fecha_compra ? ` · ${fechaAInput(pos.fecha_compra)}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={styles.filaValor}>{formatVal(valorActual)}</Text>
                      <Text style={[styles.filaGP, { color: esPositivo ? theme.green : theme.red }]}>
                        {esPositivo ? '+' : ''}{gpPct.toFixed(2)}%
                      </Text>
                      {etiq && <Text style={styles.etiqOriginal}>orig. {etiq}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => setMenuPos(pos)} style={styles.menuBoton}>
                      <Text style={styles.menuPuntos}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── MAPA DE CALOR DE CORRELACIÓN ── */}
          {posiciones.length >= 2 && (
            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity
                style={styles.mapaHeaderRow}
                onPress={() => {
                  const nuevo = !mostrarMapa;
                  setMostrarMapa(nuevo);
                  if (nuevo && correlaciones.length === 0) cargarCorrelaciones(posiciones);
                }}>
                <Text style={styles.seccionTitulo}>Correlación de activos 🔥</Text>
                <Text style={styles.mapaToggle}>{mostrarMapa ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {mostrarMapa && (
                <View style={styles.mapaContainer}>
                  {cargandoCorrel ? (
                    <View style={styles.mapaLoading}>
                      <ActivityIndicator size="small" color={theme.green} />
                      <Text style={styles.mapaLoadingTexto}>Calculando correlaciones...</Text>
                    </View>
                  ) : correlaciones.length > 0 ? (
                    <>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
                          {/* Header columnas */}
                          <View style={{ flexDirection: 'row', marginLeft: CELL_SIZE }}>
                            {tickersCorrel.map(t => (
                              <View key={t} style={[styles.mapaHeaderCell, { width: CELL_SIZE }]}>
                                <Text style={styles.mapaHeaderTexto} numberOfLines={1}>{t}</Text>
                              </View>
                            ))}
                          </View>
                          {/* Filas */}
                          {correlaciones.map((fila, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={[styles.mapaRowLabel, { width: CELL_SIZE }]}>
                                <Text style={styles.mapaHeaderTexto} numberOfLines={1}>{tickersCorrel[i]}</Text>
                              </View>
                              {fila.map((val, j) => (
                                <View key={j} style={[styles.mapaCell, {
                                  width: CELL_SIZE,
                                  height: CELL_SIZE,
                                  backgroundColor: getCorrelColor(val),
                                  borderColor: i === j ? '#FFFFFF44' : 'transparent',
                                  borderWidth: i === j ? 1 : 0,
                                }]}>
                                  <Text style={styles.mapaCellValor}>
                                    {isNaN(val) ? '—' : val.toFixed(2)}
                                  </Text>
                                  {i !== j && (
                                    <Text style={styles.mapaCellLabel}>{getCorrelLabel(val)}</Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          ))}
                        </View>
                      </ScrollView>

                      {/* Leyenda de fuentes */}
                      <View style={styles.mapaFuentesRow}>
                        {Object.entries(fuentesCorrel).map(([t, f]) => (
                          <View key={t} style={styles.mapaFuenteItem}>
                            <View style={[styles.mapaFuenteDot, { backgroundColor: f === 'yahoo' ? theme.green : theme.gold }]} />
                            <Text style={styles.mapaFuenteTexto}>{t}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.mapaFuenteNota}>
                        🟢 Yahoo Finance (real) · 🟡 Estimado por categoría
                      </Text>

                      {/* Leyenda colores */}
                      <View style={styles.mapaLeyendaRow}>
                        {[
                          { color: '#006633', label: 'Alta +' },
                          { color: '#4DC98A', label: 'Baja +' },
                          { color: '#444444', label: 'Neutra' },
                          { color: '#C97A4D', label: 'Baja −' },
                          { color: '#AA0000', label: 'Alta −' },
                        ].map(({ color, label }) => (
                          <View key={label} style={styles.mapaLeyendaItem}>
                            <View style={[styles.mapaLeyendaDot, { backgroundColor: color }]} />
                            <Text style={styles.mapaLeyendaTexto}>{label}</Text>
                          </View>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={styles.mapaRefreshBoton}
                        onPress={() => { setCorrelaciones([]); cargarCorrelaciones(posiciones); }}>
                        <Text style={styles.mapaRefreshTexto}>↻ Recalcular</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={styles.mapaLoadingTexto}>No hay datos suficientes</Text>
                  )}
                </View>
              )}
            </View>
          )}
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
                  <TouchableOpacity onPress={() => { setModalVisible(false); setSugerencias([]); }}>
                    <Text style={styles.modalCerrar}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.input} placeholder="Ticker (ej: GGAL, AAPL, GD30)"
                  placeholderTextColor={theme.gray} value={ticker} onChangeText={onChangeTicker}
                  autoCapitalize="characters" returnKeyType="next"
                  onSubmitEditing={() => refNombre.current?.focus()} blurOnSubmit={false} />
                {sugerencias.length > 0 && (
                  <View style={styles.sugerenciasContainer}>
                    {sugerencias.map((s, i) => (
                      <TouchableOpacity key={s.ticker}
                        style={[styles.sugerenciaFila, i === sugerencias.length - 1 && { borderBottomWidth: 0 }]}
                        onPress={() => seleccionarSugerencia(s)}>
                        <View style={[styles.sugerenciaIcono, { backgroundColor: COLORES_CATEGORIA[s.categoria] + '22' }]}>
                          <Text style={[styles.sugerenciaLetra, { color: COLORES_CATEGORIA[s.categoria] }]}>{s.ticker[0]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sugerenciaTicker}>{s.ticker}</Text>
                          <Text style={styles.sugerenciaNombre}>{s.nombre}</Text>
                        </View>
                        <Text style={[styles.sugerenciaCategoria, { color: COLORES_CATEGORIA[s.categoria] }]}>
                          {s.categoria.replace('_', ' ').toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TextInput style={styles.input} placeholder="Nombre (opcional)" placeholderTextColor={theme.gray}
                  value={nombre} onChangeText={setNombre} ref={refNombre} returnKeyType="next"
                  onSubmitEditing={() => refCantidad.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Cantidad / VN" placeholderTextColor={theme.gray}
                  value={cantidad} onChangeText={setCantidad} keyboardType="numeric" ref={refCantidad}
                  returnKeyType="next" onSubmitEditing={() => refPrecio.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Precio de compra" placeholderTextColor={theme.gray}
                  value={precioCompra} onChangeText={setPrecioCompra} keyboardType="numeric" ref={refPrecio}
                  returnKeyType="next" onSubmitEditing={() => refFechaCompra.current?.focus()} blurOnSubmit={false} />
                <Text style={styles.inputLabel}>Fecha de adquisición</Text>
                <TextInput style={styles.input} placeholder="DD/MM/AAAA" placeholderTextColor={theme.gray}
                  value={fechaCompra} onChangeText={t => setFechaCompra(formatearFechaInput(t))} keyboardType="numeric"
                  ref={refFechaCompra} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                <Text style={styles.inputLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {CATEGORIAS.map(cat => (
                    <TouchableOpacity key={cat.id}
                      style={[styles.catBoton, categoriaSeleccionada === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                      onPress={() => setCategoriaSeleccionada(cat.id)}>
                      <Text style={[styles.catTexto, categoriaSeleccionada === cat.id && { color: '#000' }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.inputLabel}>Moneda</Text>
                <View style={styles.monedaRow}>
                  {['ARS', 'USD'].map(m => (
                    <TouchableOpacity key={m}
                      style={[styles.monedaBoton, moneda === m && { backgroundColor: theme.green, borderColor: theme.green }]}
                      onPress={() => setMoneda(m)}>
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
                  <TouchableOpacity onPress={() => setModalEditarVisible(false)}>
                    <Text style={styles.modalCerrar}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={theme.gray}
                  value={editNombre} onChangeText={setEditNombre} returnKeyType="next"
                  onSubmitEditing={() => refEditCantidad.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Cantidad / VN" placeholderTextColor={theme.gray}
                  value={editCantidad} onChangeText={setEditCantidad} keyboardType="numeric" ref={refEditCantidad}
                  returnKeyType="next" onSubmitEditing={() => refEditPrecio.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Precio de compra" placeholderTextColor={theme.gray}
                  value={editPrecioCompra} onChangeText={setEditPrecioCompra} keyboardType="numeric" ref={refEditPrecio}
                  returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                <Text style={styles.inputLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {CATEGORIAS.map(cat => (
                    <TouchableOpacity key={cat.id}
                      style={[styles.catBoton, editCategoria === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                      onPress={() => setEditCategoria(cat.id)}>
                      <Text style={[styles.catTexto, editCategoria === cat.id && { color: '#000' }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.inputLabel}>Moneda</Text>
                <View style={styles.monedaRow}>
                  {['ARS', 'USD'].map(m => (
                    <TouchableOpacity key={m}
                      style={[styles.monedaBoton, editMoneda === m && { backgroundColor: theme.green, borderColor: theme.green }]}
                      onPress={() => setEditMoneda(m)}>
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
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuPos(null)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTicker}>{menuPos?.ticker}</Text>
            <Text style={styles.menuNombre}>{menuPos?.nombre}</Text>
            <TouchableOpacity style={styles.menuOpcion} onPress={() => menuPos && abrirEditar(menuPos)}>
              <Text style={styles.menuOpcionIcono}>✏️</Text>
              <Text style={styles.menuOpcionTexto}>Modificar datos</Text>
              <Text style={styles.menuOpcionFlecha}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOpcion} onPress={() => {
              const precioActual = getPrecioActual(menuPos!);
              const gpPct = menuPos!.precio_compra > 0 ? ((precioActual - menuPos!.precio_compra) / menuPos!.precio_compra) * 100 : 0;
              setMenuPos(null);
              router.push({
                pathname: '/detalle',
                params: {
                  ticker: menuPos!.ticker, nombre: menuPos!.nombre,
                  precioActual: precioActual.toString(), gpPct: gpPct.toString(),
                  categoria: menuPos!.categoria, cantidad: menuPos!.cantidad.toString(),
                  precioCompra: menuPos!.precio_compra.toString(),
                }
              });
            }}>
              <Text style={styles.menuOpcionIcono}>📈</Text>
              <Text style={styles.menuOpcionTexto}>Ver rendimiento</Text>
              <Text style={styles.menuOpcionFlecha}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuOpcion} onPress={() => menuPos && eliminarPosicion(menuPos)}>
              <Text style={styles.menuOpcionIcono}>🗑️</Text>
              <Text style={[styles.menuOpcionTexto, { color: theme.red }]}>Eliminar posición</Text>
              <Text style={styles.menuOpcionFlecha}>›</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  saludo: { color: theme.gray, fontSize: 12 },
  appNombre: { color: theme.white, fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  botonAgregar: { backgroundColor: theme.green, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  botonAgregarTexto: { color: '#000', fontWeight: '700', fontSize: 13 },
  toggleMoneda: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 20, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  toggleBtnTexto: { fontSize: 12, fontWeight: '800', color: theme.gray },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  totalContainer: { alignItems: 'center', paddingVertical: 20 },
  totalLabel: { color: theme.gray, fontSize: 11, letterSpacing: 1 },
  totalValor: { color: theme.white, fontSize: 36, fontWeight: '800', marginTop: 6 },
  variacionBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  variacionTexto: { fontSize: 13, fontWeight: '700' },
  cclTexto: { color: theme.gray, fontSize: 11, marginTop: 6 },
  verRendimientoBoton: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.green + '55' },
  verRendimientoTexto: { color: theme.green, fontSize: 13, fontWeight: '600' },
  tarjetasRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  tarjeta: { flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  tarjetaLabel: { color: theme.gray, fontSize: 10 },
  tarjetaValor: { color: theme.white, fontSize: 13, fontWeight: '700', marginTop: 4 },
  seccionTitulo: { color: theme.white, fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 40, gap: 16 },
  emptyTexto: { color: theme.gray, fontSize: 14 },
  botonAgregarEmpty: { backgroundColor: theme.green, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  tabla: { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  filaIcono: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  filaIconoTexto: { fontWeight: '800', fontSize: 16 },
  filaTicker: { color: theme.white, fontWeight: '700', fontSize: 15 },
  filaNombre: { color: theme.lgray, fontSize: 11, marginTop: 1 },
  filaCantidad: { color: theme.gray, fontSize: 10, marginTop: 2 },
  filaValor: { color: theme.white, fontWeight: '700', fontSize: 14 },
  filaGP: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  etiqOriginal: { color: theme.gray, fontSize: 9, marginTop: 1 },
  menuBoton: { padding: 8 },
  menuPuntos: { color: theme.gray, fontSize: 20, fontWeight: '700' },
  // ── Mapa de calor ──
  mapaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  mapaToggle: { color: theme.gray, fontSize: 14, paddingBottom: 12 },
  mapaContainer: { backgroundColor: theme.card, borderRadius: 16, marginHorizontal: 20, padding: 16, borderWidth: 1, borderColor: theme.border },
  mapaLoading: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  mapaLoadingTexto: { color: theme.gray, fontSize: 13 },
  mapaHeaderCell: { height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  mapaHeaderTexto: { color: theme.lgray, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  mapaRowLabel: { height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  mapaCell: { alignItems: 'center', justifyContent: 'center', margin: 1, borderRadius: 6 },
  mapaCellValor: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  mapaCellLabel: { color: '#FFFFFF99', fontSize: 7, marginTop: 1 },
  mapaFuentesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  mapaFuenteItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapaFuenteDot: { width: 8, height: 8, borderRadius: 4 },
  mapaFuenteTexto: { color: theme.gray, fontSize: 10 },
  mapaFuenteNota: { color: theme.gray, fontSize: 10, marginTop: 6 },
  mapaLeyendaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  mapaLeyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapaLeyendaDot: { width: 10, height: 10, borderRadius: 3 },
  mapaLeyendaTexto: { color: theme.gray, fontSize: 9 },
  mapaRefreshBoton: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.green + '55' },
  mapaRefreshTexto: { color: theme.green, fontSize: 12, fontWeight: '600' },
  // ── Modales ──
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
  sugerenciasContainer: { backgroundColor: theme.card2, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  sugerenciaFila: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 10 },
  sugerenciaIcono: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sugerenciaLetra: { fontWeight: '800', fontSize: 14 },
  sugerenciaTicker: { color: theme.white, fontWeight: '700', fontSize: 13 },
  sugerenciaNombre: { color: theme.gray, fontSize: 11, marginTop: 1 },
  sugerenciaCategoria: { fontSize: 10, fontWeight: '700' },
});