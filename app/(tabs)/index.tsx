import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
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
};

const CATEGORIAS = [
  { id: 'cedear', label: 'CEDEAR', color: '#F5C842' },
  { id: 'byma', label: 'BYMA', color: '#4D9EFF' },
  { id: 'nasdaq', label: 'NYSE/NASDAQ', color: '#A855F7' },
  { id: 'crypto', label: 'Crypto', color: '#F59E0B' },
  { id: 'bono', label: 'Bono', color: '#FF9D4D' },
  { id: 'fci', label: 'FCI', color: '#22D3EE' },
];

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

  const [ticker, setTicker] = useState('');
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('cedear');
  const [moneda, setMoneda] = useState('ARS');

  const [editNombre, setEditNombre] = useState('');
  const [editCantidad, setEditCantidad] = useState('');
  const [editPrecioCompra, setEditPrecioCompra] = useState('');
  const [editCategoria, setEditCategoria] = useState('cedear');
  const [editMoneda, setEditMoneda] = useState('ARS');
  const [posEditando, setPosEditando] = useState<Posicion | null>(null);

  const refNombre = useRef<TextInput>(null);
  const refCantidad = useRef<TextInput>(null);
  const refPrecio = useRef<TextInput>(null);
  const refEditCantidad = useRef<TextInput>(null);
  const refEditPrecio = useRef<TextInput>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
    const show = Keyboard.addListener('keyboardWillShow', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
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
    else {
      setModalEditarVisible(false);
      cargarDatos();
    }
    setGuardando(false);
  }

  async function agregarPosicion() {
    if (!ticker || !cantidad || !precioCompra) {
      Alert.alert('Error', 'Completá ticker, cantidad y precio de compra');
      return;
    }
    setGuardando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('posiciones').insert({
      usuario_id: user.id,
      ticker: ticker.toUpperCase(),
      nombre: nombre || ticker.toUpperCase(),
      categoria: categoriaSeleccionada,
      cantidad: parseFloat(cantidad),
      precio_compra: parseFloat(precioCompra),
      moneda,
    });

    if (error) Alert.alert('Error', error.message);
    else {
      setModalVisible(false);
      setTicker(''); setNombre(''); setCantidad(''); setPrecioCompra('');
      cargarDatos();
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
              cargarDatos();
            }
          }
        }
      ]
    );
  }

  const getPrecioActual = (pos: Posicion) => {
    const key = pos.categoria === 'cedear' ? `${pos.ticker}.BA` : pos.ticker;
    return precios[key] ?? precios[pos.ticker] ?? pos.precio_compra;
  };

  const totalInvertido = posiciones.reduce((s, p) => s + p.cantidad * p.precio_compra, 0);
  const totalActual = posiciones.reduce((s, p) => s + p.cantidad * getPrecioActual(p), 0);
  const ganancia = totalActual - totalInvertido;
  const gananciaPct = totalInvertido > 0 ? (ganancia / totalInvertido) * 100 : 0;
  const positivo = ganancia >= 0;

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>Mi Cartera 💼</Text>
          <Text style={styles.appNombre}>A Contar</Text>
        </View>
        <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
          <Text style={styles.botonAgregarTexto}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      ) : (
        <>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>VALOR TOTAL</Text>
            <Text style={styles.totalValor}>
              $ {totalActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </Text>
            <View style={[styles.variacionBadge, { backgroundColor: positivo ? theme.greenDim : theme.redDim }]}>
              <Text style={[styles.variacionTexto, { color: positivo ? theme.green : theme.red }]}>
                {positivo ? '+' : ''}{gananciaPct.toFixed(2)}%
                {'  '}({positivo ? '+' : ''}$ {Math.abs(ganancia).toLocaleString('es-AR', { maximumFractionDigits: 0 })})
              </Text>
            </View>
            <TouchableOpacity style={styles.verRendimientoBoton} onPress={() => router.push('/rendimiento')}>
              <Text style={styles.verRendimientoTexto}>Ver rendimiento →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tarjetasRow}>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>Invertido</Text>
              <Text style={styles.tarjetaValor}>$ {totalInvertido.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>Activos</Text>
              <Text style={[styles.tarjetaValor, { color: theme.blue }]}>{posiciones.length}</Text>
            </View>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>G/P $</Text>
              <Text style={[styles.tarjetaValor, { color: positivo ? theme.green : theme.red }]}>
                {positivo ? '+' : ''}$ {Math.abs(ganancia).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
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
                const valorActual = pos.cantidad * precioActual;
                const gp = valorActual - pos.cantidad * pos.precio_compra;
                const gpPct = ((precioActual - pos.precio_compra) / pos.precio_compra) * 100;
                const esPositivo = gp >= 0;
                const cat = CATEGORIAS.find(c => c.id === pos.categoria);
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
                      <Text style={styles.filaCantidad}>{pos.cantidad} u. · P.compra $ {pos.precio_compra.toLocaleString('es-AR')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={styles.filaValor}>$ {valorActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>
                      <Text style={[styles.filaGP, { color: esPositivo ? theme.green : theme.red }]}>
                        {esPositivo ? '+' : ''}{gpPct.toFixed(2)}%
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setMenuPos(pos)} style={styles.menuBoton}>
                      <Text style={styles.menuPuntos}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* MODAL AGREGAR */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => Keyboard.dismiss()} style={styles.modalOverlay}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitulo}>Agregar posición</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.modalCerrar}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput style={styles.input} placeholder="Ticker (ej: GGAL, AAPL, BTC)" placeholderTextColor={theme.gray}
                  value={ticker} onChangeText={t => setTicker(t.toUpperCase())} autoCapitalize="characters"
                  returnKeyType="next" onSubmitEditing={() => refNombre.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Nombre (opcional)" placeholderTextColor={theme.gray}
                  value={nombre} onChangeText={setNombre}
                  ref={refNombre} returnKeyType="next" onSubmitEditing={() => refCantidad.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Cantidad" placeholderTextColor={theme.gray}
                  value={cantidad} onChangeText={setCantidad} keyboardType="numeric"
                  ref={refCantidad} returnKeyType="next" onSubmitEditing={() => refPrecio.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Precio de compra" placeholderTextColor={theme.gray}
                  value={precioCompra} onChangeText={setPrecioCompra} keyboardType="numeric"
                  ref={refPrecio} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />

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
                  value={editNombre} onChangeText={setEditNombre}
                  returnKeyType="next" onSubmitEditing={() => refEditCantidad.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Cantidad" placeholderTextColor={theme.gray}
                  value={editCantidad} onChangeText={setEditCantidad} keyboardType="numeric"
                  ref={refEditCantidad} returnKeyType="next" onSubmitEditing={() => refEditPrecio.current?.focus()} blurOnSubmit={false} />
                <TextInput style={styles.input} placeholder="Precio de compra" placeholderTextColor={theme.gray}
                  value={editPrecioCompra} onChangeText={setEditPrecioCompra} keyboardType="numeric"
                  ref={refEditPrecio} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />

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

      {/* MODAL MENU TRES PUNTITOS */}
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
              const gpPct = ((precioActual - menuPos!.precio_compra) / menuPos!.precio_compra) * 100;
              setMenuPos(null);
              router.push({
                pathname: '/detalle',
                params: {
                  ticker: menuPos!.ticker,
                  nombre: menuPos!.nombre,
                  precioActual: precioActual.toString(),
                  gpPct: gpPct.toString(),
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
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  totalContainer: { alignItems: 'center', paddingVertical: 20 },
  totalLabel: { color: theme.gray, fontSize: 11, letterSpacing: 1 },
  totalValor: { color: theme.white, fontSize: 36, fontWeight: '800', marginTop: 6 },
  variacionBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  variacionTexto: { fontSize: 13, fontWeight: '700' },
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
  menuBoton: { padding: 8 },
  menuPuntos: { color: theme.gray, fontSize: 20, fontWeight: '700' },
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
});