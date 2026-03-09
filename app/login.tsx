import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';

export default function Login() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
    const show = Keyboard.addListener('keyboardWillShow', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  async function handleAuth() {
    if (!email || !password) { setError('Completá email y contraseña'); return; }
    setCargando(true);
    setError('');

    if (esRegistro) {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setError(err.message); setCargando(false); return; }
      if (data.user) {
        await supabase.from('usuarios').insert({ id: data.user.id, nombre: email.split('@')[0], plan: 'free' });
        router.replace('/(tabs)');
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError('Email o contraseña incorrectos'); setCargando(false); return; }
      router.replace('/(tabs)');
    }
    setCargando(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => Keyboard.dismiss()}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">

          <View style={styles.top}>
            <Text style={styles.logo}>ArgylnVest</Text>
            <Text style={styles.slogan}>Tu cartera de inversiones argentina 🇦🇷</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.titulo}>{esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={theme.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleAuth}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.boton} onPress={handleAuth} disabled={cargando}>
              {cargando
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.botonTexto}>{esRegistro ? 'Registrarme' : 'Entrar'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setEsRegistro(!esRegistro); setError(''); }}>
              <Text style={styles.toggle}>
                {esRegistro ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Hecho en Argentina 🇦🇷 · v0.1</Text>

        </ScrollView>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'space-between', padding: 24 },
  top: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  logo: { color: theme.green, fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  slogan: { color: theme.gray, fontSize: 14, marginTop: 8 },
  card: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border },
  titulo: { color: theme.white, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  input: { backgroundColor: theme.card2, borderRadius: 10, padding: 14, color: theme.white, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  error: { color: theme.red, fontSize: 13, marginBottom: 12 },
  boton: { backgroundColor: theme.green, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  botonTexto: { color: '#000', fontWeight: '800', fontSize: 15 },
  toggle: { color: theme.lgray, textAlign: 'center', fontSize: 13 },
  footer: { color: theme.gray, textAlign: 'center', fontSize: 11, paddingVertical: 20 },
});