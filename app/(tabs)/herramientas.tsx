import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { COLORES_CATEGORIA } from '@/lib/tickers';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OperacionImportada = {
  ticker: string;
  tipo: 'COMPRA' | 'VENTA';
  fecha: string;
  cantidad: number;
  precio: number;
  comision: number;
  moneda: string;
  categoria: string;
  seleccionada: boolean;
};

function inferirCategoria(ticker: string): string {
  const cedears = ['AAPL','GOOGL','MSFT','AMZN','NVDA','META','TSLA','AMD','BABA','MELI','NFLX','DIS','PYPL','UBER','ABNB','SPOT','INTC','ORCL','CRM','SHOP','SQ','SNAP','COIN','WMT','JPM','BAC','KO','PEP','MCD','NKE','SPY','QQQ','IVV','DIA','IWM','EEM','IEMG','ACWI','EFA','IEUR','EWJ','XLE','XLF','EWZ','GLD','SLV','GDX','ARKK','IBB','IBIT','ETHA','SH','PSQ','VIG','IJH','USO','FXI','XLK','XLV','XLI'];
  const bonos_usd = ['AL29','AL30','AL35','GD29','GD30','GD35','GD38','GD41','GD46'];
  const bonos_ars = ['TX26','TX27','TX28','TX29','TX30','DICP','PARP','CUAP','PR13','TZX26','TZX27','TZX28','TZXD5'];
  const letras = ['S31E5','S28F5','S31M5','S30A5','S30Y5','S18J5','S31L5','S29G5','S30S5','S31O5','S28N5','S31D5','S30J6','S31D6'];
  const crypto = ['BTC','ETH','SOL','ADA','USDT','BNB','XRP','DOGE'];
  if (cedears.includes(ticker)) return 'cedear';
  if (bonos_usd.includes(ticker)) return 'bono_usd';
  if (bonos_ars.includes(ticker)) return 'bono_ars';
  if (letras.includes(ticker)) return 'letra';
  if (crypto.includes(ticker)) return 'crypto';
  if (/^[SXTZ]\d/.test(ticker)) return 'letra';
  if (/^(AL|GD|AE|AA)\d/.test(ticker)) return 'bono_usd';
  if (/^(TX|TZ|DICP|PARP)/.test(ticker)) return 'bono_ars';
  return 'byma';
}

function inferirMoneda(categoria: string): string {
  if (['bono_usd', 'nasdaq', 'crypto'].includes(categoria)) return 'USD';
  return 'ARS';
}

function parsearFechaIOL(str: string): string {
  const [d, m, y] = str.trim().split('/');
  if (!d || !m || !y) return new Date().toISOString().split('T')[0];
  const anio = parseInt(y) < 50 ? `20${y}` : `19${y}`;
  return `${anio}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parsearNumeroIOL(str: string): number {
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function extraerTickerYTipo(tipoMov: string): { ticker: string; tipo: 'COMPRA' | 'VENTA' } | null {
  const match = tipoMov.match(/\(([^)]+)\)/);
  if (!match) return null;
  const ticker = match[1].trim().toUpperCase();
  const lower = tipoMov.toLowerCase();
  const esCompra = lower.includes('compra') || lower.includes('suscr');
  const esVenta = lower.includes('venta') || lower.includes('rescate');
  if (!esCompra && !esVenta) return null;
  return { ticker, tipo: esCompra ? 'COMPRA' : 'VENTA' };
}

function parsearArchivoIOL(html: string): OperacionImportada[] {
  const ops: OperacionImportada[] = [];
  const filaRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const celdaRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let filaMatch;
  while ((filaMatch = filaRegex.exec(html)) !== null) {
    const filaHTML = filaMatch[1];
    const celdas: string[] = [];
    let celdaMatch;
    while ((celdaMatch = celdaRegex.exec(filaHTML)) !== null) {
      const texto = celdaMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
        .replace(/&#243;/g, 'ó').replace(/&[^;]+;/g, '')
        .replace(/\s+/g, ' ').trim();
      celdas.push(texto);
    }
    if (celdas.length < 8) continue;
    if (celdas[0] === 'Nro. de Mov.' || celdas[2] === 'Tipo Mov.') continue;
    const tipoMov = celdas[2] || '';
    const parsed = extraerTickerYTipo(tipoMov);
    if (!parsed) continue;
    const fecha = parsearFechaIOL(celdas[3] || '');
    const cantidad = parsearNumeroIOL(celdas[6] || '0');
    const precio = parsearNumeroIOL(celdas[7] || '0');
    const comision = parsearNumeroIOL(celdas[8] || '0');
    if (cantidad <= 0 || precio <= 0) continue;
    const categoria = inferirCategoria(parsed.ticker);
    ops.push({ ticker: parsed.ticker, tipo: parsed.tipo, fecha, cantidad, precio, comision, moneda: inferirMoneda(categoria), categoria, seleccionada: true });
  }
  return ops;
}

export default function Herramientas() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme);

  const [paso, setPaso] = useState<'inicio' | 'preview' | 'importando' | 'listo'>('inicio');
  const [operaciones, setOperaciones] = useState<OperacionImportada[]>([]);
  const [progreso, setProgreso] = useState(0);
  const [importadas, setImportadas] = useState(0);
  const [errores, setErrores] = useState<string[]>([]);

  async function seleccionarArchivo() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      const contenido = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const ops = parsearArchivoIOL(contenido);
      if (ops.length === 0) {
        Alert.alert('Sin operaciones', 'No se encontraron compras o ventas. Verificá que sea el historial de movimientos de IOL.');
        return;
      }
      setOperaciones(ops);
      setPaso('preview');
    } catch (e) {
      Alert.alert('Error', 'No se pudo leer el archivo.');
    }
  }

  function toggleSeleccion(idx: number) {
    setOperaciones(prev => prev.map((op, i) => i === idx ? { ...op, seleccionada: !op.seleccionada } : op));
  }

  function toggleTodas() {
    const todas = operaciones.every(o => o.seleccionada);
    setOperaciones(prev => prev.map(op => ({ ...op, seleccionada: !todas })));
  }

  async function importar() {
    const seleccionadas = operaciones.filter(o => o.seleccionada);
    if (seleccionadas.length === 0) return;
    setPaso('importando');
    setProgreso(0);
    const errs: string[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (let i = 0; i < seleccionadas.length; i++) {
      const op = seleccionadas[i];
      try {
        await supabase.from('operaciones').insert({
          usuario_id: user.id, ticker: op.ticker, tipo: op.tipo,
          cantidad: op.cantidad, precio: op.precio, comision: op.comision,
          moneda: op.moneda, fecha: op.fecha, notas: 'Importado desde IOL',
        });
      } catch { errs.push(`${op.ticker} ${op.fecha}`); }
      setProgreso(Math.round(((i + 1) / seleccionadas.length) * 100));
    }

    // Calcular y guardar posiciones netas
    const compras = seleccionadas.filter(o => o.tipo === 'COMPRA');
    const ventas = seleccionadas.filter(o => o.tipo === 'VENTA');
    const neto: Record<string, { cantidad: number; costoTotal: number; op: OperacionImportada; fechaMin: string }> = {};

    for (const op of compras) {
      if (!neto[op.ticker]) neto[op.ticker] = { cantidad: 0, costoTotal: 0, op, fechaMin: op.fecha };
      neto[op.ticker].cantidad += op.cantidad;
      neto[op.ticker].costoTotal += op.cantidad * op.precio;
      if (op.fecha < neto[op.ticker].fechaMin) neto[op.ticker].fechaMin = op.fecha;
    }
    for (const op of ventas) {
      if (neto[op.ticker]) neto[op.ticker].cantidad -= op.cantidad;
    }

    for (const [ticker, data] of Object.entries(neto)) {
      if (data.cantidad <= 0) continue;
      const cantTotalComprada = compras.filter(o => o.ticker === ticker).reduce((s, o) => s + o.cantidad, 0);
      const ppc = cantTotalComprada > 0 ? data.costoTotal / cantTotalComprada : 0;
      try {
        const { data: existing } = await supabase.from('posiciones').select('id').eq('usuario_id', user.id).eq('ticker', ticker).limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from('posiciones').insert({
            usuario_id: user.id, ticker, nombre: ticker,
            categoria: data.op.categoria, cantidad: data.cantidad,
            precio_compra: Math.round(ppc * 100) / 100,
            moneda: data.op.moneda, fecha_compra: data.fechaMin,
          });
        }
      } catch { errs.push(`Posición ${ticker}`); }
    }

    setImportadas(seleccionadas.length);
    setErrores(errs);
    setPaso('listo');
  }

  function reiniciar() {
    setPaso('inicio'); setOperaciones([]); setProgreso(0); setErrores([]);
  }

  const seleccionadas = operaciones.filter(o => o.seleccionada).length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.titulo}>Herramientas 🧮</Text>
        <Text style={styles.subtitulo}>Importar y gestionar tu cartera</Text>
      </View>

      {paso === 'inicio' && (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Importar desde broker</Text>

          <TouchableOpacity style={styles.importCard} onPress={seleccionarArchivo}>
            <View style={styles.importIcono}><Text style={{ fontSize: 32 }}>📥</Text></View>
            <Text style={styles.importTitulo}>IOL InvertirOnline</Text>
            <Text style={styles.importDesc}>Importá tu historial de movimientos directamente desde el archivo XLS de IOL. Carga automática de operaciones y posiciones.</Text>
            <View style={styles.importBoton}><Text style={styles.importBotonTexto}>Seleccionar archivo →</Text></View>
          </TouchableOpacity>

          <View style={styles.instruccionesCard}>
            <Text style={styles.instruccionesTitulo}>¿Cómo exportar desde IOL?</Text>
            {['1. Ingresá a InvertirOnline', '2. Ir a "Mis inversiones" → "Movimientos"', '3. Seleccioná el período a importar', '4. Hacé click en "Exportar" → "Excel"', '5. Subí el archivo acá'].map((p, i) => (
              <Text key={i} style={styles.instruccionesTexto}>{p}</Text>
            ))}
          </View>

          <View style={styles.proximamenteCard}>
            <Text style={styles.instruccionesTitulo}>Próximamente</Text>
            <View style={styles.proximamenteRow}>
              {['Balanz', 'PPI', 'Bull Market', 'CSV genérico'].map(b => (
                <View key={b} style={styles.proximamenteBadge}><Text style={styles.proximamenteBadgeTexto}>{b}</Text></View>
              ))}
            </View>
          </View>
        </View>
      )}

      {paso === 'preview' && (
        <View style={styles.seccion}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.seccionTitulo}>Operaciones encontradas</Text>
              <Text style={styles.previewSub}>{seleccionadas} de {operaciones.length} seleccionadas</Text>
            </View>
            <TouchableOpacity onPress={toggleTodas} style={styles.toggleTodas}>
              <Text style={styles.toggleTodasTexto}>{operaciones.every(o => o.seleccionada) ? 'Deselec. todas' : 'Selec. todas'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabla}>
            {operaciones.map((op, i) => {
              const catColor = COLORES_CATEGORIA[op.categoria] ?? '#888';
              return (
                <TouchableOpacity key={i} style={[styles.opFila, i === operaciones.length - 1 && { borderBottomWidth: 0 }, !op.seleccionada && { opacity: 0.4 }]} onPress={() => toggleSeleccion(i)}>
                  <View style={[styles.opCheckbox, op.seleccionada && { backgroundColor: catColor, borderColor: catColor }]}>
                    {op.seleccionada && <Text style={{ color: '#000', fontSize: 10, fontWeight: '800' }}>✓</Text>}
                  </View>
                  <View style={[styles.opTipoBadge, { backgroundColor: (op.tipo === 'COMPRA' ? '#00D26A' : '#FF4D4D') + '22' }]}>
                    <Text style={[styles.opTipoTexto, { color: op.tipo === 'COMPRA' ? '#00D26A' : '#FF4D4D' }]}>{op.tipo === 'COMPRA' ? '↑' : '↓'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.opTicker}>{op.ticker}</Text>
                      <View style={[styles.opCategoriaBadge, { backgroundColor: catColor + '22' }]}>
                        <Text style={[styles.opCategoriaTexto, { color: catColor }]}>{op.categoria.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    <Text style={styles.opDetalle}>{op.cantidad} u. × ${op.precio.toLocaleString('es-AR')} · {op.fecha.split('-').reverse().join('/')}</Text>
                  </View>
                  <Text style={[styles.opMonto, { color: op.tipo === 'COMPRA' ? '#FF4D4D' : '#00D26A' }]}>
                    {op.tipo === 'COMPRA' ? '-' : '+'}${(op.cantidad * op.precio).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.botonesRow}>
            <TouchableOpacity style={styles.botonSecundario} onPress={reiniciar}>
              <Text style={styles.botonSecundarioTexto}>← Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botonPrimario, seleccionadas === 0 && { opacity: 0.4 }]} onPress={importar} disabled={seleccionadas === 0}>
              <Text style={styles.botonPrimarioTexto}>Importar {seleccionadas} ops →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {paso === 'importando' && (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.green} />
          <Text style={styles.importandoTitulo}>Importando operaciones...</Text>
          <View style={styles.progresoBar}>
            <View style={[styles.progresoFill, { width: `${progreso}%` as any }]} />
          </View>
          <Text style={styles.importandoPct}>{progreso}%</Text>
        </View>
      )}

      {paso === 'listo' && (
        <View style={styles.centrado}>
          <Text style={{ fontSize: 56 }}>🎉</Text>
          <Text style={styles.listoTitulo}>¡Importación completa!</Text>
          <Text style={styles.listoDesc}>{importadas} operaciones importadas y posiciones actualizadas.</Text>
          {errores.length > 0 && (
            <View style={styles.erroresCard}>
              <Text style={styles.erroresTitulo}>{errores.length} advertencias</Text>
              {errores.map((e, i) => <Text key={i} style={styles.errorTexto}>· {e}</Text>)}
            </View>
          )}
          <TouchableOpacity style={styles.botonPrimario} onPress={reiniciar}>
            <Text style={styles.botonPrimarioTexto}>Importar otro archivo</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  titulo: { color: theme.white, fontSize: 24, fontWeight: '800' },
  subtitulo: { color: theme.gray, fontSize: 13, marginTop: 4 },
  seccion: { paddingHorizontal: 20, paddingBottom: 40 },
  seccionTitulo: { color: theme.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  importCard: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.green + '44', marginBottom: 16, alignItems: 'center' },
  importIcono: { width: 64, height: 64, borderRadius: 20, backgroundColor: theme.green + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  importTitulo: { color: theme.white, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  importDesc: { color: theme.gray, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  importBoton: { backgroundColor: theme.green, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  importBotonTexto: { color: '#000', fontWeight: '700', fontSize: 14 },
  instruccionesCard: { backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  instruccionesTitulo: { color: theme.lgray, fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  instruccionesTexto: { color: theme.gray, fontSize: 13, lineHeight: 22 },
  proximamenteCard: { backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  proximamenteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  proximamenteBadge: { backgroundColor: theme.card2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: theme.border },
  proximamenteBadgeTexto: { color: theme.gray, fontSize: 12 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  previewSub: { color: theme.gray, fontSize: 12, marginTop: 2 },
  toggleTodas: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  toggleTodasTexto: { color: theme.lgray, fontSize: 11, fontWeight: '600' },
  tabla: { backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  opFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 10 },
  opCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  opTipoBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  opTipoTexto: { fontSize: 14, fontWeight: '800' },
  opTicker: { color: theme.white, fontWeight: '700', fontSize: 14 },
  opCategoriaBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  opCategoriaTexto: { fontSize: 9, fontWeight: '700' },
  opDetalle: { color: theme.gray, fontSize: 10, marginTop: 2 },
  opMonto: { fontSize: 12, fontWeight: '700' },
  botonesRow: { flexDirection: 'row', gap: 10 },
  botonPrimario: { flex: 1, backgroundColor: theme.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  botonPrimarioTexto: { color: '#000', fontWeight: '800', fontSize: 14 },
  botonSecundario: { backgroundColor: theme.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16 },
  botonSecundarioTexto: { color: theme.lgray, fontWeight: '600', fontSize: 14 },
  centrado: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60, gap: 16 },
  importandoTitulo: { color: theme.white, fontSize: 18, fontWeight: '700' },
  progresoBar: { width: '100%', height: 6, backgroundColor: theme.card, borderRadius: 3, overflow: 'hidden' },
  progresoFill: { height: 6, backgroundColor: theme.green, borderRadius: 3 },
  importandoPct: { color: theme.green, fontSize: 24, fontWeight: '800' },
  listoTitulo: { color: theme.white, fontSize: 22, fontWeight: '800' },
  listoDesc: { color: theme.gray, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  erroresCard: { backgroundColor: theme.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.gold + '44', width: '100%' },
  erroresTitulo: { color: theme.gold, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  errorTexto: { color: theme.gray, fontSize: 12, lineHeight: 20 },
});
