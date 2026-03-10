import { guardarTokenPush, registrarNotificaciones } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

function RootLayoutInner() {
  const { isDark } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setTimeout(() => router.replace('/login'), 100);
      } else {
        // Registrar notificaciones push cuando hay sesión activa
        registrarNotificaciones().then(token => {
          if (token) guardarTokenPush(token);
        });
      }
    });

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
        <Stack.Screen name="detalle" options={{ headerShown: false }} />
        <Stack.Screen name="alertas" options={{ headerShown: false }} />
        <Stack.Screen name="rendimiento" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}