import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
type Operacion = {
  id: string;
  ticker: string;
  tipo: string;
  cantidad: number;
  precio: number;
  comision: number;
  moneda: string;
  fecha: string;
  notas: string;
};

export default function Historial() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Form
  const [ticker, setTicker] = useState('');
  const [tipo, setTipo] = useState('COMPRA');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [comision, setComision] = useState('0');
  const [moneda, setMoneda] = useState('ARS');
  const [notas, setNotas] = useState('');

  async function cargarOperaciones() {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('operaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('fecha', { ascending: false });
    if (data) setOperaciones(data);
    setCargando(false);
  }

  useEffect(() => { cargarOperaciones(); }, []);

  async function agregarOperacion() {
    if (!ticker || !cantidad || !precio) {
      Alert.alert('Error', 'Completá ticker, cantidad y precio');
      return;
    }
    setGuardando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('operaciones').insert({
      usuario_id: user.id,
      ticker: ticker.toUpperCase(),
      tipo,
      cantidad: parseFloat(cantidad),
      precio: parseFloat(precio),
      comision: parseFloat(comision) || 0,
      moneda,
      fecha: new Date().toISOString().split('T')[0],
      notas,
    });

    if (error) Alert.alert('Error', error.message);
    else {
      setModalVisible(false);
      setTicker(''); setCantidad(''); setPrecio(''); setComision('0'); setNotas('');
      cargarOperaciones();
    }
    setGuardando(false);
  }

  const totalCompras = operaciones
    .filter(o => o.tipo === 'COMPRA')
    .reduce((s, o) => s + o.cantidad * o.precio, 0);

  const totalVentas = operaciones
    .filter(o => o.tipo === 'VENTA')
    .reduce((s, o) => s + o.cantidad * o.precio, 0);

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>Historial 📋</Text>
          <Text style={styles.subtitulo}>{operaciones.length} operaciones</Text>
        </View>
        <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
          <Text style={styles.botonAgregarTexto}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* RESUMEN */}
      <View style={styles.tarjetasRow}>
        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaLabel}>Total comprado</Text>
          <Text style={[styles.tarjetaValor, { color: '#00D26A' }]}>
            $ {totalCompras.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaLabel}>Total vendido</Text>
          <Text style={[styles.tarjetaValor, { color: '#FF4D4D' }]}>
            $ {totalVentas.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D26A" />
        </View>
      ) : operaciones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTexto}>No hay operaciones todavía</Text>
          <TouchableOpacity style={styles.botonAgregarEmpty} onPress={() => setModalVisible(true)}>
            <Text style={styles.botonAgregarTexto}>+ Registrar primera operación</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tabla}>
          {operaciones.map((op, i) => {
            const esCompra = op.tipo === 'COMPRA';
            const total = op.cantidad * op.precio;
            return (
              <View key={op.id} style={[styles.fila, i === operaciones.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.filaIcono, { backgroundColor: esCompra ? '#00D26A22' : '#FF4D4D22' }]}>
                  <Text style={[styles.filaIconoTexto, { color: esCompra ? '#00D26A' : '#FF4D4D' }]}>
                    {esCompra ? '↑' : '↓'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.filaTicker}>{op.ticker}</Text>
                    <View style={[styles.tipoBadge, { backgroundColor: esCompra ? '#00D26A22' : '#FF4D4D22' }]}>
                      <Text style={[styles.tipoTexto, { color: esCompra ? '#00D26A' : '#FF4D4D' }]}>{op.tipo}</Text>
                    </View>
                  </View>
                  <Text style={styles.filaDetalle}>
                    {op.cantidad} u. · {op.moneda} {op.precio.toLocaleString('es-AR')}
                  </Text>
                  {op.notas ? <Text style={styles.filaNota}>{op.notas}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.filaTotal}>
                    $ {total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={styles.filaFecha}>{op.fecha}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Nueva operación</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCerrar}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Ticker (ej: GGAL, AAPL)" placeholderTextColor="#555"
              value={ticker} onChangeText={t => setTicker(t.toUpperCase())} autoCapitalize="characters" />

            {/* Tipo */}
            <Text style={styles.inputLabel}>Tipo de operación</Text>
            <View style={styles.tipoRow}>
              {['COMPRA', 'VENTA'].map(t => (
                <TouchableOpacity key={t}
                  style={[styles.tipoBoton,
                    tipo === t && { backgroundColor: t === 'COMPRA' ? '#00D26A' : '#FF4D4D',
                    borderColor: t === 'COMPRA' ? '#00D26A' : '#FF4D4D' }]}
                  onPress={() => setTipo(t)}>
                  <Text style={[styles.tipoBotonTexto, tipo === t && { color: '#000' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder="Cantidad" placeholderTextColor="#555"
              value={cantidad} onChangeText={setCantidad} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Precio unitario" placeholderTextColor="#555"
              value={precio} onChangeText={setPrecio} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Comisión (opcional)" placeholderTextColor="#555"
              value={comision} onChangeText={setComision} keyboardType="numeric" />

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

            <TextInput style={styles.input} placeholder="Notas (opcional)" placeholderTextColor="#555"
              value={notas} onChangeText={setNotas} />

            <TouchableOpacity style={styles.botonGuardar} onPress={agregarOperacion} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#000" /> : <Text style={styles.botonGuardarTexto}>Guardar operación</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  titulo: { color: theme.white, fontSize: 22, fontWeight: '800' },
  subtitulo: { color: theme.gray, fontSize: 12, marginTop: 2 },
  botonAgregar: { backgroundColor: theme.green, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  botonAgregarTexto: { color: '#000', fontWeight: '700', fontSize: 13 },
  tarjetasRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  tarjeta: { flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border },
  tarjetaLabel: { color: theme.gray, fontSize: 10, marginBottom: 4 },
  tarjetaValor: { fontSize: 14, fontWeight: '700' },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 40, gap: 16 },
  emptyTexto: { color: theme.gray, fontSize: 14 },
  botonAgregarEmpty: { backgroundColor: theme.green, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  tabla: { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  filaIcono: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filaIconoTexto: { fontWeight: '800', fontSize: 20 },
  filaTicker: { color: theme.white, fontWeight: '700', fontSize: 15 },
  filaDetalle: { color: theme.lgray, fontSize: 11, marginTop: 2 },
  filaNota: { color: theme.gray, fontSize: 10, marginTop: 2 },
  filaTotal: { color: theme.white, fontWeight: '700', fontSize: 14 },
  filaFecha: { color: theme.gray, fontSize: 11, marginTop: 2 },
  tipoBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tipoTexto: { fontSize: 10, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { color: theme.white, fontSize: 18, fontWeight: '700' },
  modalCerrar: { color: theme.gray, fontSize: 20 },
  input: { backgroundColor: theme.card2, borderRadius: 10, padding: 14, color: theme.white, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  inputLabel: { color: theme.lgray, fontSize: 12, marginBottom: 8 },
  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tipoBoton: { flex: 1, backgroundColor: theme.card2, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  tipoBotonTexto: { color: theme.lgray, fontWeight: '700' },
  monedaRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  monedaBoton: { flex: 1, backgroundColor: theme.card2, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  monedaTexto: { color: theme.lgray, fontWeight: '700' },
  botonGuardar: { backgroundColor: theme.green, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  botonGuardarTexto: { color: '#000', fontWeight: '800', fontSize: 15 },
});