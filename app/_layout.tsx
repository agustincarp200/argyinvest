import { supabase } from '@/lib/supabase';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

export default function RootLayout() {

  useEffect(() => {
    // Verificar si hay sesión activa al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setTimeout(() => router.replace('/login'), 100);
      }
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setTimeout(() => router.replace('/login'), 100);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}