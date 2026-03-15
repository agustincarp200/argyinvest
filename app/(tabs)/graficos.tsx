import { useTheme } from '@/lib/theme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Graficos() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.titulo}>Gráficos 📈</Text>
        <Text style={styles.subtitulo}>Visualizá tu cartera en detalle</Text>
      </View>
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  titulo: { color: theme.white, fontSize: 24, fontWeight: '800' },
  subtitulo: { color: theme.gray, fontSize: 13, marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitulo: { color: theme.white, fontSize: 18, fontWeight: '700' },
  emptyTexto: { color: theme.gray, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
