import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Completá email y contraseña');
      return;
    }
    setCargando(true);
    if (esRegistro) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('Error', error.message);
      else Alert.alert('¡Listo!', 'Revisá tu email para confirmar la cuenta');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Error', 'Email o contraseña incorrectos');
      else router.replace('/(tabs)');
    }
    setCargando(false);
  }

  return (
    <View style={styles.container}>

      {/* LOGO */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>ArgylnVest</Text>
        <Text style={styles.logoSub}>Tu cartera argentina 🇦🇷</Text>
      </View>

      {/* FORM */}
      <View style={styles.form}>
        <Text style={styles.titulo}>{esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.boton} onPress={handleAuth} disabled={cargando}>
          {cargando
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.botonTexto}>{esRegistro ? 'Crear cuenta' : 'Entrar'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setEsRegistro(!esRegistro)}>
          <Text style={styles.cambiar}>
            {esRegistro ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate'}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logo: { color: '#00D26A', fontSize: 36, fontWeight: '800' },
  logoSub: { color: '#555', fontSize: 14, marginTop: 6 },
  form: { backgroundColor: '#141414', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#222' },
  titulo: { color: '#F5F5F5', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  input: { backgroundColor: '#1A1A1A', borderRadius: 10, padding: 14, color: '#F5F5F5', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  boton: { backgroundColor: '#00D26A', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  botonTexto: { color: '#000', fontWeight: '800', fontSize: 15 },
  cambiar: { color: '#555', fontSize: 13, textAlign: 'center' },
});