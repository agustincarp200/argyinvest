import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Posicion = {
  ticker: string;
  cantidad: number;
  categoria: string;
};

type Evento = {
  id: number;
  ticker: string;
  tipo: 'dividendo' | 'cupon' | 'amortizacion' | 'vencimiento';
  fecha: string;
  monto_por_unidad: number | null;
  moneda: string;
  descripcion: string;
};

type EventoEnriquecido = Evento & {
  cantidad: number;
  montoTotal: number | null;
};

const TIPO_CONFIG = {
  dividendo:    { emoji: '💵', label: 'Dividendo',    color: '#00D26A' },
  cupon:        { emoji: '🏦', label: 'Cupón',         color: '#4D9EFF' },
  amortizacion: { emoji: '💰', label: 'Amortización', color: '#F5C842' },
  vencimiento:  { emoji: '⏰', label: 'Vencimiento',  color: '#FF9D4D' },
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function parseFecha(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatFechaCorta(iso: string): string {
  const f = parseFecha(iso);
  return `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)} ${f.getFullYear()}`;
}

function diasRestantes(iso: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fecha = parseFecha(iso);
  return Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function agruparPorMes(eventos: EventoEnriquecido[]): Record<string, EventoEnriquecido[]> {
  const grupos: Record<string, EventoEnriquecido[]> = {};
  for (const ev of eventos) {
    const f = parseFecha(ev.fecha);
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(ev);
  }
  return grupos;
}

function getLabelMes(clave: string): string {
  const [y, m] = clave.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

function getDiasDelMes(year: number, month: number): (number | null)[] {
  const primerDia = new Date(year, month, 1).getDay();
  const totalDias = new Date(year, month + 1, 0).getDate();
  const dias: (number | null)[] = Array(primerDia).fill(null);
  for (let d = 1; d <= totalDias; d++) dias.push(d);
  return dias;
}

export default function Calendario() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [eventos, setEventos] = useState<EventoEnriquecido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<'lista' | 'mensual'>('lista');
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);

  // Vista mensual
  const hoy = new Date();
  const [mesActual, setMesActual] = useState(hoy.getMonth());
  const [anioActual, setAnioActual] = useState(hoy.getFullYear());

  useEffect(() => { cargarEventos(); }, []);

  async function cargarEventos() {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Traer posiciones del usuario
      const { data: posiciones } = await supabase
        .from('posiciones')
        .select('ticker, cantidad, categoria')
        .eq('usuario_id', user.id);

      if (!posiciones || posiciones.length === 0) { setCargando(false); return; }

      // Agrupar por ticker sumando cantidades
      const tickerMap: Record<string, number> = {};
      for (const p of posiciones) {
        tickerMap[p.ticker] = (tickerMap[p.ticker] ?? 0) + p.cantidad;
      }
      const tickers = Object.keys(tickerMap);

      // Traer eventos futuros filtrados por tickers del usuario
      const hoyISO = new Date().toISOString().split('T')[0];
      const { data: evs } = await supabase
        .from('eventos_calendario')
        .select('*')
        .in('ticker', tickers)
        .gte('fecha', hoyISO)
        .order('fecha', { ascending: true });

      if (!evs) { setCargando(false); return; }

      // Enriquecer con cantidad y monto total
      const enriquecidos: EventoEnriquecido[] = evs.map(ev => {
        const cantidad = tickerMap[ev.ticker] ?? 0;
        const montoTotal = ev.monto_por_unidad != null ? ev.monto_por_unidad * cantidad : null;
        return { ...ev, cantidad, montoTotal };
      });

      setEventos(enriquecidos);
    } catch (e) {
      console.error('Error cargando eventos:', e);
    }
    setCargando(false);
  }

  const eventosFiltrados = filtroTipo
    ? eventos.filter(e => e.tipo === filtroTipo)
    : eventos;

  // Monto total cobrable en el próximo mes
  const proximoMesISO = (() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 7);
  })();
  const cobrosProximoMes = eventos
    .filter(e => e.fecha.startsWith(proximoMesISO) && e.montoTotal != null)
    .reduce((s, e) => s + (e.montoTotal ?? 0), 0);

  // Eventos del mes en vista mensual
  const eventosDelMes = eventosFiltrados.filter(e => {
    const f = parseFecha(e.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const eventosPorDia: Record<number, EventoEnriquecido[]> = {};
  for (const ev of eventosDelMes) {
    const d = parseFecha(ev.fecha).getDate();
    if (!eventosPorDia[d]) eventosPorDia[d] = [];
    eventosPorDia[d].push(ev);
  }

  const diasMes = getDiasDelMes(anioActual, mesActual);

  function navMes(dir: number) {
    let m = mesActual + dir;
    let y = anioActual;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setMesActual(m);
    setAnioActual(y);
  }

  const gruposMes = agruparPorMes(eventosFiltrados);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Próximos eventos</Text>
          <Text style={styles.headerTitulo}>Calendario 📅</Text>
        </View>
        <View style={styles.toggleVista}>
          <TouchableOpacity
            style={[styles.toggleBtn, vistaActiva === 'lista' && { backgroundColor: theme.blue }]}
            onPress={() => setVistaActiva('lista')}>
            <Text style={[styles.toggleBtnTexto, vistaActiva === 'lista' && { color: '#fff' }]}>≡ Lista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, vistaActiva === 'mensual' && { backgroundColor: theme.blue }]}
            onPress={() => setVistaActiva('mensual')}>
            <Text style={[styles.toggleBtnTexto, vistaActiva === 'mensual' && { color: '#fff' }]}>▦ Mes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      ) : eventos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitulo}>Sin eventos próximos</Text>
          <Text style={styles.emptyTexto}>Los dividendos, cupones y vencimientos de tus activos aparecerán aquí</Text>
        </View>
      ) : (
        <>
          {/* Resumen cobros */}
          {cobrosProximoMes > 0 && (
            <View style={styles.resumenCard}>
              <Text style={styles.resumenLabel}>COBROS ESTIMADOS · PRÓXIMO MES</Text>
              <Text style={styles.resumenMonto}>
                u$s {cobrosProximoMes.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          )}

          {/* Filtro por tipo */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow}>
            <TouchableOpacity
              style={[styles.filtroBtn, !filtroTipo && { backgroundColor: theme.card2, borderColor: theme.white + '44' }]}
              onPress={() => setFiltroTipo(null)}>
              <Text style={[styles.filtroBtnTexto, !filtroTipo && { color: theme.white }]}>Todos ({eventos.length})</Text>
            </TouchableOpacity>
            {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
              const count = eventos.filter(e => e.tipo === tipo).length;
              if (count === 0) return null;
              return (
                <TouchableOpacity key={tipo}
                  style={[styles.filtroBtn, filtroTipo === tipo && { backgroundColor: cfg.color + '33', borderColor: cfg.color }]}
                  onPress={() => setFiltroTipo(filtroTipo === tipo ? null : tipo)}>
                  <Text style={[styles.filtroBtnTexto, filtroTipo === tipo && { color: cfg.color }]}>
                    {cfg.emoji} {cfg.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── VISTA LISTA ── */}
          {vistaActiva === 'lista' && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
              {Object.entries(gruposMes).map(([clave, evs]) => (
                <View key={clave} style={{ marginBottom: 24 }}>
                  <Text style={styles.mesLabel}>{getLabelMes(clave)}</Text>
                  <View style={styles.tabla}>
                    {evs.map((ev, i) => {
                      const cfg = TIPO_CONFIG[ev.tipo];
                      const dias = diasRestantes(ev.fecha);
                      const esHoy = dias === 0;
                      const esMuyProximo = dias <= 7 && dias > 0;
                      return (
                        <View key={ev.id} style={[
                          styles.eventoFila,
                          i === evs.length - 1 && { borderBottomWidth: 0 },
                          esHoy && { backgroundColor: cfg.color + '11' },
                        ]}>
                          <View style={[styles.eventoIcono, { backgroundColor: cfg.color + '22' }]}>
                            <Text style={styles.eventoEmoji}>{cfg.emoji}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.eventoTicker}>{ev.ticker}</Text>
                              <View style={[styles.tipoBadge, { backgroundColor: cfg.color + '22' }]}>
                                <Text style={[styles.tipoBadgeTexto, { color: cfg.color }]}>{cfg.label}</Text>
                              </View>
                              {esHoy && (
                                <View style={[styles.tipoBadge, { backgroundColor: theme.green + '33' }]}>
                                  <Text style={[styles.tipoBadgeTexto, { color: theme.green }]}>HOY</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.eventoDesc}>{ev.descripcion}</Text>
                            <Text style={styles.eventoFecha}>
                              {formatFechaCorta(ev.fecha)}
                              {dias > 0 && (
                                <Text style={[styles.eventoFecha, { color: esMuyProximo ? theme.gold : theme.gray }]}>
                                  {' · en '}{dias}d
                                </Text>
                              )}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            {ev.montoTotal != null ? (
                              <>
                                <Text style={[styles.eventoMonto, { color: cfg.color }]}>
                                  {ev.moneda === 'USD' ? 'u$s' : '$'}{' '}
                                  {ev.montoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                                <Text style={styles.eventoUnidad}>
                                  {ev.cantidad} u. × {ev.moneda === 'USD' ? 'u$s' : '$'}{ev.monto_por_unidad?.toFixed(4)}
                                </Text>
                              </>
                            ) : (
                              <Text style={[styles.eventoMonto, { color: theme.gray }]}>CER</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── VISTA MENSUAL ── */}
          {vistaActiva === 'mensual' && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
              {/* Navegación mes */}
              <View style={styles.navMesRow}>
                <TouchableOpacity onPress={() => navMes(-1)} style={styles.navMesBtn}>
                  <Text style={styles.navMesBtnTexto}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.navMesTitulo}>{MESES[mesActual]} {anioActual}</Text>
                <TouchableOpacity onPress={() => navMes(1)} style={styles.navMesBtn}>
                  <Text style={styles.navMesBtnTexto}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Grid días de semana */}
              <View style={styles.gridSemana}>
                {DIAS_SEMANA.map(d => (
                  <View key={d} style={styles.gridDiaSemana}>
                    <Text style={styles.gridDiaSemanaTexto}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Grid días del mes */}
              <View style={styles.gridDias}>
                {diasMes.map((dia, idx) => {
                  if (dia === null) return <View key={`v-${idx}`} style={styles.gridDiaVacio} />;
                  const evsDelDia = eventosPorDia[dia] ?? [];
                  const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear();
                  return (
                    <View key={`d-${dia}`} style={[styles.gridDia, esHoy && { borderColor: theme.blue, borderWidth: 1 }]}>
                      <Text style={[styles.gridDiaNum, esHoy && { color: theme.blue, fontWeight: '800' }]}>{dia}</Text>
                      <View style={styles.gridDotRow}>
                        {evsDelDia.slice(0, 3).map((ev, i) => (
                          <View key={i} style={[styles.gridDot, { backgroundColor: TIPO_CONFIG[ev.tipo].color }]} />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Lista de eventos del mes seleccionado */}
              {eventosDelMes.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.mesLabel}>Eventos de {MESES[mesActual]}</Text>
                  <View style={styles.tabla}>
                    {eventosDelMes.map((ev, i) => {
                      const cfg = TIPO_CONFIG[ev.tipo];
                      const dias = diasRestantes(ev.fecha);
                      return (
                        <View key={ev.id} style={[styles.eventoFila, i === eventosDelMes.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={[styles.eventoIcono, { backgroundColor: cfg.color + '22' }]}>
                            <Text style={styles.eventoEmoji}>{cfg.emoji}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.eventoTicker}>{ev.ticker}</Text>
                              <View style={[styles.tipoBadge, { backgroundColor: cfg.color + '22' }]}>
                                <Text style={[styles.tipoBadgeTexto, { color: cfg.color }]}>{cfg.label}</Text>
                              </View>
                            </View>
                            <Text style={styles.eventoDesc}>{ev.descripcion}</Text>
                            <Text style={styles.eventoFecha}>
                              {formatFechaCorta(ev.fecha)}
                              {dias > 0 && <Text style={{ color: theme.gray }}> · en {dias}d</Text>}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            {ev.montoTotal != null ? (
                              <>
                                <Text style={[styles.eventoMonto, { color: cfg.color }]}>
                                  {ev.moneda === 'USD' ? 'u$s' : '$'}{' '}
                                  {ev.montoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                                <Text style={styles.eventoUnidad}>
                                  {ev.cantidad} u. × {ev.monto_por_unidad?.toFixed(4)}
                                </Text>
                              </>
                            ) : (
                              <Text style={[styles.eventoMonto, { color: theme.gray }]}>CER</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyMes}>
                  <Text style={styles.emptyTexto}>Sin eventos este mes para tus activos</Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  headerSub: { color: theme.gray, fontSize: 12 },
  headerTitulo: { color: theme.white, fontSize: 22, fontWeight: '800', marginTop: 2 },
  toggleVista: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 20, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  toggleBtnTexto: { fontSize: 12, fontWeight: '700', color: theme.gray },
  loadingContainer: { alignItems: 'center', marginTop: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitulo: { color: theme.white, fontSize: 18, fontWeight: '700' },
  emptyTexto: { color: theme.gray, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  resumenCard: { backgroundColor: theme.card, borderRadius: 16, marginHorizontal: 20, marginBottom: 16, padding: 20, borderWidth: 1, borderColor: theme.green + '44', alignItems: 'center' },
  resumenLabel: { color: theme.gray, fontSize: 10, letterSpacing: 1, marginBottom: 6 },
  resumenMonto: { color: theme.green, fontSize: 28, fontWeight: '800' },
  filtrosRow: { paddingHorizontal: 20, marginBottom: 20 },
  filtroBtn: { backgroundColor: theme.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  filtroBtnTexto: { color: theme.gray, fontSize: 12, fontWeight: '600' },
  mesLabel: { color: theme.lgray, fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tabla: { backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  eventoFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  eventoIcono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventoEmoji: { fontSize: 18 },
  eventoTicker: { color: theme.white, fontWeight: '700', fontSize: 14 },
  eventoDesc: { color: theme.lgray, fontSize: 11, marginTop: 2 },
  eventoFecha: { color: theme.gray, fontSize: 10, marginTop: 2 },
  eventoMonto: { fontWeight: '700', fontSize: 14 },
  eventoUnidad: { color: theme.gray, fontSize: 9, marginTop: 2 },
  tipoBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  tipoBadgeTexto: { fontSize: 9, fontWeight: '700' },
  // Vista mensual
  navMesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navMesBtn: { width: 36, height: 36, backgroundColor: theme.card, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  navMesBtnTexto: { color: theme.white, fontSize: 20, fontWeight: '700' },
  navMesTitulo: { color: theme.white, fontSize: 17, fontWeight: '700' },
  gridSemana: { flexDirection: 'row', marginBottom: 4 },
  gridDiaSemana: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  gridDiaSemanaTexto: { color: theme.gray, fontSize: 10, fontWeight: '700' },
  gridDias: { flexDirection: 'row', flexWrap: 'wrap' },
  gridDia: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, padding: 2 },
  gridDiaVacio: { width: `${100 / 7}%`, aspectRatio: 1 },
  gridDiaNum: { color: theme.lgray, fontSize: 12 },
  gridDotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  gridDot: { width: 5, height: 5, borderRadius: 3 },
  emptyMes: { alignItems: 'center', marginTop: 24 },
});
