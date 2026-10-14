import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useOrders } from '@/hooks/queries';
import { useWatchOrders } from '@/hooks/realtime';
import { activeStatuses } from '@/constants/status.constants';
import { useTheme } from '@/theme/ThemeProvider';
import type { IconName } from '@/components/ui';

function icon(name: IconName, focusedName: IconName) {
  function TabBarIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? focusedName : name} color={color as string} size={size} />;
  }
  return TabBarIcon;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  // Una sola lista para todas las pestanas: aqui se une a las salas de las
  // ordenes vivas, asi el estado llega por socket en cualquier pantalla.
  const orders = useOrders();
  useWatchOrders(orders.data);
  const active = (orders.data ?? []).filter((o) => activeStatuses.has(o.status)).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Envíos',
          tabBarIcon: icon('cube-outline', 'cube'),
          tabBarBadge: active > 0 ? active : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onPrimary, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: icon('time-outline', 'time') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
