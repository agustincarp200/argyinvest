import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Alerta = {
  id: string;
  ticker: string;
  tipo: string;
  valor: number;
  activa: boolean;
  disparada: boolean;
};

const TIPOS = [
  { id: 'stop_loss', label: 'Stop Loss', desc: 'Avisa cuando baja X%', icon: '📉', color: '#FF4D4D' },
  { id: 'stop_gain', label: 'Stop Gain', desc: 'Avisa cuando sube X%', icon: '📈', color: '#00D26A' },
  { id: 'precio_exacto', label: 'Precio exacto', desc: 'Avisa cuando llega a $X', icon: '🎯', color: '#4D9EFF' },
  { id: 'variacion_diaria', label: 'Variación diaria', desc: 'Avisa si varía más de X%', icon: '⚡', color: '#F5C842' },
];

export default function Alertas() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [ticker, setTicker] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('stop_loss');
  const [valor, setValor] = useState('');

  async function cargarAlertas() {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('alertas')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setAlertas(data);
    setCargando(false);
  }

  useEffect(() => { cargarAlertas(); }, []);

  async function agregarAlerta() {
    if (!ticker || !valor) {
      Alert.alert('Error', 'Completá ticker y valor');
      return;
    }
    setGuardando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('alertas').insert({
      usuario_id: user.id,
      ticker: ticker.toUpperCase(),
      tipo: tipoSeleccionado,
      valor: parseFloat(valor),
      activa: true,
      disparada: false,
    });

    if (error) Alert.alert('Error', error.message);
    else {
      setModalVisible(false);
      setTicker(''); setValor('');
      cargarAlertas();
    }
    setGuardando(false);
  }

  async function toggleAlerta(alerta: Alerta) {
    await supabase.from('alertas').update({ activa: !alerta.activa }).eq('id', alerta.id);
    cargarAlertas();
  }

  async function eliminarAlerta(alerta: Alerta) {
    Alert.alert('Eliminar alerta', `¿Eliminar alerta de ${alerta.ticker}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('alertas').delete().eq('id', alerta.id);
          cargarAlertas();
        }
      }
    ]);
  }

  function getTipo(id: string) {
    return TIPOS.find(t => t.id === id) ?? TIPOS[0];
  }

  function getDescValor(alerta: Alerta) {
    if (alerta.tipo === 'precio_exacto') return `Precio: $${alerta.valor.toLocaleString('es-AR')}`;
    return `Variación: ${alerta.valor}%`;
  }

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBoton}>
          <Text style={styles.backTexto}>‹ Volver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
          <Text style={styles.botonAgregarTexto}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.titulo}>Alertas 🔔</Text>
      <Text style={styles.subtitulo}>Recibí notificaciones cuando se cumplan tus condiciones</Text>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      ) : alertas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcono}>🔔</Text>
          <Text style={styles.emptyTexto}>No tenés alertas configuradas</Text>
          <TouchableOpacity style={styles.botonAgregarEmpty} onPress={() => setModalVisible(true)}>
            <Text style={styles.botonAgregarTexto}>+ Crear primera alerta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tabla}>
          {alertas.map((alerta, i) => {
            const tipo = getTipo(alerta.tipo);
            return (
              <View key={alerta.id} style={[styles.fila, i === alertas.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.filaIcono, { backgroundColor: tipo.color + '22' }]}>
                  <Text style={{ fontSize: 18 }}>{tipo.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.filaTicker}>{alerta.ticker}</Text>
                    {alerta.disparada && (
                      <View style={styles.disparadaBadge}>
                        <Text style={styles.disparadaTexto}>✓ Disparada</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.filaTipo, { color: tipo.color }]}>{tipo.label}</Text>
                  <Text style={styles.filaValor}>{getDescValor(alerta)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => toggleAlerta(alerta)}
                    style={[styles.toggle, { backgroundColor: alerta.activa ? theme.green : theme.border }]}>
                    <View style={[styles.toggleCircle, { alignSelf: alerta.activa ? 'flex-end' : 'flex-start' }]} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminarAlerta(alerta)}>
                    <Text style={{ color: theme.red, fontSize: 16 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL AGREGAR */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} style={styles.modalOverlay}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>Nueva alerta</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCerrar}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Ticker (ej: GGAL, AAPL, BTC)"
                placeholderTextColor={theme.gray}
                value={ticker}
                onChangeText={t => setTicker(t.toUpperCase())}
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Tipo de alerta</Text>
              {TIPOS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tipoBoton, tipoSeleccionado === t.id && { borderColor: t.color, backgroundColor: t.color + '11' }]}
                  onPress={() => setTipoSeleccionado(t.id)}>
                  <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tipoLabel, tipoSeleccionado === t.id && { color: t.color }]}>{t.label}</Text>
                    <Text style={styles.tipoDesc}>{t.desc}</Text>
                  </View>
                  {tipoSeleccionado === t.id && <Text style={{ color: t.color }}>✓</Text>}
                </TouchableOpacity>
              ))}

              <Text style={styles.inputLabel}>
                {tipoSeleccionado === 'precio_exacto' ? 'Precio objetivo ($)' : 'Porcentaje (%)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={tipoSeleccionado === 'precio_exacto' ? 'ej: 15000' : 'ej: 10'}
                placeholderTextColor={theme.gray}
                value={valor}
                onChangeText={setValor}
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.botonGuardar} onPress={agregarAlerta} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#000" /> : <Text style={styles.botonGuardarTexto}>Guardar alerta</Text>}
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  backBoton: { alignSelf: 'flex-start' },
  backTexto: { color: theme.green, fontSize: 17, fontWeight: '600' },
  botonAgregar: { backgroundColor: theme.green, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  botonAgregarTexto: { color: '#000', fontWeight: '700', fontSize: 13 },
  titulo: { color: theme.white, fontSize: 24, fontWeight: '900', paddingHorizontal: 20, marginBottom: 6 },
  subtitulo: { color: theme.gray, fontSize: 12, paddingHorizontal: 20, marginBottom: 24 },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
  emptyIcono: { fontSize: 48 },
  emptyTexto: { color: theme.gray, fontSize: 14 },
  botonAgregarEmpty: { backgroundColor: theme.green, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  tabla: { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  filaIcono: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filaTicker: { color: theme.white, fontWeight: '700', fontSize: 15 },
  filaTipo: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  filaValor: { color: theme.gray, fontSize: 11, marginTop: 2 },
  disparadaBadge: { backgroundColor: theme.greenDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  disparadaTexto: { color: theme.green, fontSize: 10, fontWeight: '700' },
  toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3 },
  toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { color: theme.white, fontSize: 18, fontWeight: '700' },
  modalCerrar: { color: theme.gray, fontSize: 20 },
  input: { backgroundColor: theme.card2, borderRadius: 10, padding: 14, color: theme.white, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  inputLabel: { color: theme.lgray, fontSize: 12, marginBottom: 8 },
  tipoBoton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card2, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  tipoLabel: { color: theme.white, fontSize: 13, fontWeight: '700' },
  tipoDesc: { color: theme.gray, fontSize: 11, marginTop: 2 },
  botonGuardar: { backgroundColor: theme.green, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  botonGuardarTexto: { color: '#000', fontWeight: '800', fontSize: 15 },
});