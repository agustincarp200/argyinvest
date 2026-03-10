import { formatFecha, getInstrumento, getPagosFuturos, labelTipoPago } from '@/lib/renta-fija';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type PagoConInfo = {
  fecha: string;
  tipo: string;
  monto: number;
  moneda: string;
  diasRestantes: number;
  ticker: string;
  nombre: string;
};

export default function Calendario() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [pagos, setPagos] = useState<PagoConInfo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [totalARS, setTotalARS] = useState(0);
  const [totalUSD, setTotalUSD] = useState(0);

  useEffect(() => { cargarPagos(); }, []);

  async function cargarPagos() {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: posiciones } = await supabase
      .from('posiciones')
      .select('*')
      .eq('usuario_id', user.id)
      .in('categoria', ['bono', 'letra', 'bono_ars', 'bono_usd', 'on']);

    if (!posiciones || posiciones.length === 0) {
      setPagos([]);
      setCargando(false);
      return;
    }

    const todosPagos: PagoConInfo[] = [];

    for (const pos of posiciones) {
      const instrumento = getInstrumento(pos.ticker);
      const nombre = instrumento?.nombre ?? pos.nombre ?? pos.ticker;
      const futuros = getPagosFuturos(pos.ticker, pos.cantidad, pos.precio_compra);

      for (const pago of futuros) {
        todosPagos.push({
          ...pago,
          ticker: pos.ticker,
          nombre,
        });
      }
    }

    todosPagos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    setPagos(todosPagos);

    const ars = todosPagos.filter(p => p.moneda === 'ARS').reduce((s, p) => s + p.monto, 0);
    const usd = todosPagos.filter(p => p.moneda === 'USD').reduce((s, p) => s + p.monto, 0);
    setTotalARS(ars);
    setTotalUSD(usd);

    setCargando(false);
  }

  function colorTipo(tipo: string) {
    if (tipo === 'cupon') return theme.green;
    if (tipo === 'amortizacion') return theme.blue;
    return theme.gold;
  }

  function iconTipo(tipo: string) {
    if (tipo === 'cupon') return '💰';
    if (tipo === 'amortizacion') return '🏦';
    return '✅';
  }

  function badgeDias(dias: number) {
    if (dias <= 7) return { bg: theme.redDim, color: theme.red, texto: `${dias}d` };
    if (dias <= 30) return { bg: theme.gold + '22', color: theme.gold, texto: `${dias}d` };
    return { bg: theme.greenDim, color: theme.green, texto: `${dias}d` };
  }

  // Agrupar por mes
  const pagosPorMes: Record<string, PagoConInfo[]> = {};
  for (const p of pagos) {
    const key = new Date(p.fecha).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    if (!pagosPorMes[key]) pagosPorMes[key] = [];
    pagosPorMes[key].push(p);
  }

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBoton}>
          <Text style={styles.backTexto}>‹ Volver</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.titulo}>Calendario de pagos 📅</Text>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      ) : pagos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcono}>📭</Text>
          <Text style={styles.emptyTitulo}>Sin instrumentos de renta fija</Text>
          <Text style={styles.emptyDesc}>Agregá bonos o letras en tu cartera para ver el calendario de pagos</Text>
          <TouchableOpacity style={styles.emptyBoton} onPress={() => router.back()}>
            <Text style={styles.emptyBotonTexto}>Ir a mi cartera →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* RESUMEN TOTAL */}
          <View style={styles.resumenContainer}>
            <Text style={styles.resumenTitulo}>Total proyectado a cobrar</Text>
            <View style={styles.resumenRow}>
              {totalARS > 0 && (
                <View style={styles.resumenCard}>
                  <Text style={styles.resumenMoneda}>ARS</Text>
                  <Text style={[styles.resumenValor, { color: theme.green }]}>
                    $ {totalARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              )}
              {totalUSD > 0 && (
                <View style={styles.resumenCard}>
                  <Text style={styles.resumenMoneda}>USD</Text>
                  <Text style={[styles.resumenValor, { color: theme.blue }]}>
                    u$s {totalUSD.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.leyendaRow}>
              {[
                { tipo: 'cupon', label: 'Cupón' },
                { tipo: 'amortizacion', label: 'Amortización' },
                { tipo: 'vencimiento', label: 'Vencimiento' },
              ].map(l => (
                <View key={l.tipo} style={styles.leyendaItem}>
                  <View style={[styles.leyendaDot, { backgroundColor: colorTipo(l.tipo) }]} />
                  <Text style={styles.leyendaTexto}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* LISTA POR MES */}
          {Object.entries(pagosPorMes).map(([mes, items]) => {
            const subtotalARS = items.filter(p => p.moneda === 'ARS').reduce((s, p) => s + p.monto, 0);
            const subtotalUSD = items.filter(p => p.moneda === 'USD').reduce((s, p) => s + p.monto, 0);
            return (
              <View key={mes} style={styles.mesContainer}>
                <View style={styles.mesHeader}>
                  <Text style={styles.mesTitulo}>
                    {mes.charAt(0).toUpperCase() + mes.slice(1)}
                  </Text>
                  <View style={styles.mesSubtotales}>
                    {subtotalARS > 0 && (
                      <Text style={[styles.mesSubtotal, { color: theme.green }]}>
                        $ {subtotalARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </Text>
                    )}
                    {subtotalUSD > 0 && (
                      <Text style={[styles.mesSubtotal, { color: theme.blue }]}>
                        u$s {subtotalUSD.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.tabla}>
                  {items.map((pago, i) => {
                    const badge = badgeDias(pago.diasRestantes);
                    return (
                      <View key={i} style={[styles.fila, i === items.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={[styles.filaIcono, { backgroundColor: colorTipo(pago.tipo) + '22' }]}>
                          <Text style={{ fontSize: 18 }}>{iconTipo(pago.tipo)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.filaTicker}>{pago.ticker}</Text>
                          <Text style={styles.filaNombre}>{pago.nombre}</Text>
                          <View style={styles.filaMeta}>
                            <View style={[styles.tipoBadge, { backgroundColor: colorTipo(pago.tipo) + '22' }]}>
                              <Text style={[styles.tipoTexto, { color: colorTipo(pago.tipo) }]}>
                                {labelTipoPago(pago.tipo)}
                              </Text>
                            </View>
                            <Text style={styles.filaFecha}>{formatFecha(pago.fecha)}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text style={styles.filaMonto}>
                            {pago.moneda === 'USD' ? 'u$s' : '$'}{' '}
                            {pago.monto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                          </Text>
                          <View style={[styles.diasBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.diasTexto, { color: badge.color }]}>
                              en {badge.texto}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <View style={{ height: 30 }} />
        </>
      )}
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  backBoton: { alignSelf: 'flex-start' },
  backTexto: { color: theme.green, fontSize: 17, fontWeight: '600' },
  titulo: { color: theme.white, fontSize: 24, fontWeight: '900', paddingHorizontal: 20, marginBottom: 16 },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyIcono: { fontSize: 48 },
  emptyTitulo: { color: theme.white, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyDesc: { color: theme.gray, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBoton: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.green + '55' },
  emptyBotonTexto: { color: theme.green, fontWeight: '600' },
  resumenContainer: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 24 },
  resumenTitulo: { color: theme.gray, fontSize: 11, letterSpacing: 0.5, marginBottom: 12 },
  resumenRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  resumenCard: { flex: 1, backgroundColor: theme.card2, borderRadius: 12, padding: 12, alignItems: 'center' },
  resumenMoneda: { color: theme.gray, fontSize: 11, marginBottom: 4 },
  resumenValor: { fontSize: 18, fontWeight: '800' },
  leyendaRow: { flexDirection: 'row', gap: 14 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaDot: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { color: theme.gray, fontSize: 11 },
  mesContainer: { marginHorizontal: 20, marginBottom: 20 },
  mesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mesTitulo: { color: theme.white, fontSize: 15, fontWeight: '700' },
  mesSubtotales: { alignItems: 'flex-end', gap: 2 },
  mesSubtotal: { fontSize: 12, fontWeight: '700' },
  tabla: { backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  filaIcono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filaTicker: { color: theme.white, fontWeight: '700', fontSize: 14 },
  filaNombre: { color: theme.gray, fontSize: 11, marginTop: 1 },
  filaMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  tipoBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tipoTexto: { fontSize: 10, fontWeight: '700' },
  filaFecha: { color: theme.lgray, fontSize: 11 },
  filaMonto: { color: theme.white, fontWeight: '700', fontSize: 14 },
  diasBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  diasTexto: { fontSize: 10, fontWeight: '700' },
});