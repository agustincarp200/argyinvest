import { useTheme } from '@/lib/theme';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme.card,
        borderTopColor: theme.border,
        borderTopWidth: 1,
      },
      tabBarActiveTintColor: theme.green,
      tabBarInactiveTintColor: theme.gray,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Cartera', tabBarIcon: ({ color }) => (
        <TabIcon emoji="💼" color={color} />
      )}} />
      <Tabs.Screen name="mercado" options={{ title: 'Mercado', tabBarIcon: ({ color }) => (
        <TabIcon emoji="📊" color={color} />
      )}} />
      <Tabs.Screen name="buscar" options={{ title: 'Historial', tabBarIcon: ({ color }) => (
        <TabIcon emoji="📋" color={color} />
      )}} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => (
        <TabIcon emoji="👤" color={color} />
      )}} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === '#888' ? 0.4 : 1 }}>{emoji}</Text>;
}