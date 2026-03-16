import { useTheme } from '@/lib/theme';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, opacity: color === '#888' ? 0.4 : 1 }}>{emoji}</Text>;
}

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.green,
        tabBarInactiveTintColor: theme.gray,
      }}>

      <Tabs.Screen name="index" options={{
        title: 'Inicio',
        tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
      }} />

      <Tabs.Screen name="mercado" options={{
        title: 'Mercado',
        tabBarIcon: ({ color }) => <TabIcon emoji="📰" color={color} />,
      }} />

      <Tabs.Screen name="graficos" options={{
        title: 'Gráficos',
        tabBarIcon: ({ color }) => <TabIcon emoji="📈" color={color} />,
      }} />

      <Tabs.Screen name="buscar" options={{
        title: 'Historial',
        tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
      }} />

      <Tabs.Screen name="herramientas" options={{
        title: 'Herramientas',
        tabBarIcon: ({ color }) => <TabIcon emoji="🧮" color={color} />,
      }} />

      {/* Ocultos del tab bar */}
      <Tabs.Screen name="calendario" options={{ href: null }} />
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />

    </Tabs>
  );
}
