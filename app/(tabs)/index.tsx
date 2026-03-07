import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Posicion = {
  id: string;
  ticker: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  precio_compra: number;
  moneda: string;
  precio_actual?: number;
  variacion_pct?: number;
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
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Form state
  const [ticker, setTicker] = useState('');
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('cedear');
  const [moneda, setMoneda] = useState('ARS');

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

  // Cálculos
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

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>Mi Cartera 💼</Text>
          <Text style={styles.appNombre}>ArgylnVest</Text>
        </View>
        <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
          <Text style={styles.botonAgregarTexto}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D26A" />
        </View>
      ) : (
        <>
          {/* VALOR TOTAL */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>VALOR TOTAL</Text>
            <Text style={styles.totalValor}>
              $ {totalActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </Text>
            <View style={[styles.variacionBadge, { backgroundColor: positivo ? '#00D26A22' : '#FF4D4D22' }]}>
              <Text style={[styles.variacionTexto, { color: positivo ? '#00D26A' : '#FF4D4D' }]}>
                {positivo ? '+' : ''}{gananciaPct.toFixed(2)}%
                {'  '}({positivo ? '+' : ''}$ {Math.abs(ganancia).toLocaleString('es-AR', { maximumFractionDigits: 0 })})
              </Text>
            </View>
          </View>

          {/* TARJETAS */}
          <View style={styles.tarjetasRow}>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>Invertido</Text>
              <Text style={styles.tarjetaValor}>$ {totalInvertido.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>Activos</Text>
              <Text style={[styles.tarjetaValor, { color: '#4D9EFF' }]}>{posiciones.length}</Text>
            </View>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaLabel}>G/P $</Text>
              <Text style={[styles.tarjetaValor, { color: positivo ? '#00D26A' : '#FF4D4D' }]}>
                {positivo ? '+' : ''}$ {Math.abs(ganancia).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          {/* LISTA POSICIONES */}
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
                    <View style={[styles.filaIcono, { backgroundColor: (cat?.color ?? '#00D26A') + '22' }]}>
                      <Text style={[styles.filaIconoTexto, { color: cat?.color ?? '#00D26A' }]}>
                        {pos.ticker[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filaTicker}>{pos.ticker}</Text>
                      <Text style={styles.filaNombre}>{pos.nombre}</Text>
                      <Text style={styles.filaCantidad}>{pos.cantidad} u. · P.compra $ {pos.precio_compra.toLocaleString('es-AR')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.filaValor}>$ {valorActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>
                      <Text style={[styles.filaGP, { color: esPositivo ? '#00D26A' : '#FF4D4D' }]}>
                        {esPositivo ? '+' : ''}{gpPct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* MODAL AGREGAR POSICIÓN */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Agregar posición</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCerrar}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Ticker (ej: GGAL, AAPL, BTC)" placeholderTextColor="#555"
              value={ticker} onChangeText={t => setTicker(t.toUpperCase())} autoCapitalize="characters" />
            <TextInput style={styles.input} placeholder="Nombre (opcional)" placeholderTextColor="#555"
              value={nombre} onChangeText={setNombre} />
            <TextInput style={styles.input} placeholder="Cantidad" placeholderTextColor="#555"
              value={cantidad} onChangeText={setCantidad} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Precio de compra" placeholderTextColor="#555"
              value={precioCompra} onChangeText={setPrecioCompra} keyboardType="numeric" />

            {/* Categoría */}
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

            {/* Moneda */}
            <Text style={styles.inputLabel}>Moneda</Text>
            <View style={styles.monedaRow}>
              {['ARS', 'USD'].map(m => (
                <TouchableOpacity key={m}
                  style={[styles.monedaBoton, moneda === m && { backgroundColor: '#00D26A', borderColor: '#00D26A' }]}
                  onPress={() => setMoneda(m)}>
                  <Text style={[styles.monedaTexto, moneda === m && { color: '#000' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.botonGuardar} onPress={agregarPosicion} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#000" /> : <Text style={styles.botonGuardarTexto}>Guardar posición</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  saludo: { color: '#888', fontSize: 12 },
  appNombre: { color: '#F5F5F5', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  botonAgregar: { backgroundColor: '#00D26A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  botonAgregarTexto: { color: '#000', fontWeight: '700', fontSize: 13 },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  totalContainer: { alignItems: 'center', paddingVertical: 20 },
  totalLabel: { color: '#555', fontSize: 11, letterSpacing: 1 },
  totalValor: { color: '#F5F5F5', fontSize: 36, fontWeight: '800', marginTop: 6 },
  variacionBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  variacionTexto: { fontSize: 13, fontWeight: '700' },
  tarjetasRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  tarjeta: { flex: 1, backgroundColor: '#141414', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  tarjetaLabel: { color: '#555', fontSize: 10 },
  tarjetaValor: { color: '#F5F5F5', fontSize: 13, fontWeight: '700', marginTop: 4 },
  seccionTitulo: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 40, gap: 16 },
  emptyTexto: { color: '#555', fontSize: 14 },
  botonAgregarEmpty: { backgroundColor: '#00D26A', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  tabla: { backgroundColor: '#141414', borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#222' },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', gap: 12 },
  filaIcono: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filaIconoTexto: { fontWeight: '800', fontSize: 16 },
  filaTicker: { color: '#F5F5F5', fontWeight: '700', fontSize: 15 },
  filaNombre: { color: '#888', fontSize: 11, marginTop: 1 },
  filaCantidad: { color: '#555', fontSize: 10, marginTop: 2 },
  filaValor: { color: '#F5F5F5', fontWeight: '700', fontSize: 14 },
  filaGP: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#141414', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { color: '#F5F5F5', fontSize: 18, fontWeight: '700' },
  modalCerrar: { color: '#555', fontSize: 20 },
  input: { backgroundColor: '#1A1A1A', borderRadius: 10, padding: 14, color: '#F5F5F5', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  inputLabel: { color: '#888', fontSize: 12, marginBottom: 8 },
  catBoton: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: '#222' },
  catTexto: { color: '#888', fontSize: 12, fontWeight: '600' },
  monedaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  monedaBoton: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  monedaTexto: { color: '#888', fontWeight: '700' },
  botonGuardar: { backgroundColor: '#00D26A', borderRadius: 12, padding: 16, alignItems: 'center' },
  botonGuardarTexto: { color: '#000', fontWeight: '800', fontSize: 15 },
});