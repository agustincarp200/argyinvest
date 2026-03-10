import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});

export async function registrarNotificaciones(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alertas', {
      name: 'Alertas de precio',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    console.log('Push token no disponible en desarrollo');
    return null;
  }
}

export async function guardarTokenPush(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('usuarios').upsert({
    id: user.id,
    push_token: token,
  }, { onConflict: 'id' });
}

export async function notificacionLocal(titulo: string, cuerpo: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, sound: true },
    trigger: null,
  });
}