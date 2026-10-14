import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { useCustomerMe } from '@/hooks/queries';
import { useTheme } from '@/theme/ThemeProvider';
import { isNotFound } from '@/utils/errors';

/**
 * Zona con sesion. `GET /customers/me` responde 404 cuando la cuenta no tiene
 * perfil fiscal (p. ej. creada por operaciones): entonces solo se puede
 * completar el perfil. Cualquier otro error (sin red) deja entrar igual.
 */
export default function AppLayout() {
  const { colors } = useTheme();
  const customer = useCustomerMe();
  const needsProfile = customer.isError && isNotFound(customer.error);

  if (customer.isPending && customer.fetchStatus !== 'idle') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerBackTitle: 'Atrás', headerShadowVisible: false }}>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen name="complete-profile" options={{ title: 'Completa tu perfil', headerBackVisible: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!needsProfile}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="request/index" options={{ title: 'Nuevo envío' }} />
        <Stack.Screen name="request/location" options={{ title: 'Elegir dirección', presentation: 'modal' }} />
        <Stack.Screen name="request/vehicle" options={{ title: 'Vehículo y pago' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Detalle del envío' }} />
        <Stack.Screen name="orders/incident" options={{ title: 'Reportar un problema', presentation: 'modal' }} />
        <Stack.Screen name="payments/index" options={{ title: 'Pagos' }} />
        <Stack.Screen name="payments/cardnet" options={{ title: 'Pago con tarjeta', presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="payments/receipt" options={{ title: 'Comprobante' }} />
        <Stack.Screen name="reservations" options={{ title: 'Reservas' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notificaciones' }} />
        <Stack.Screen name="profile/edit" options={{ title: 'Datos personales' }} />
        <Stack.Screen name="profile/email" options={{ title: 'Cambiar correo' }} />
        <Stack.Screen name="profile/password" options={{ title: 'Cambiar contraseña' }} />
        <Stack.Screen name="profile/addresses" options={{ title: 'Mis direcciones' }} />
        <Stack.Screen name="profile/address" options={{ title: 'Dirección' }} />
        <Stack.Screen name="profile/billing" options={{ title: 'Facturación' }} />
        <Stack.Screen name="profile/credit" options={{ title: 'Crédito corporativo' }} />
        <Stack.Screen name="profile/sessions" options={{ title: 'Sesiones abiertas' }} />
        <Stack.Screen name="profile/notifications" options={{ title: 'Preferencias de avisos' }} />
      </Stack.Protected>
    </Stack>
  );
}
