import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>ArgylnVest 🚀</Text>
      <Text style={styles.subtitulo}>Tu cartera argentina</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    color: '#00D26A',
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#888888',
    fontSize: 16,
    marginTop: 8,
  },
});