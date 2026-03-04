import { StyleSheet, Text, View } from 'react-native';

export default function Mercado() {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>Mercado 📊</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  texto: { color: '#00D26A', fontSize: 24, fontWeight: 'bold' },
});