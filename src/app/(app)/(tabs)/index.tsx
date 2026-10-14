import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button, EmptyState, IconButton, ListRow, SectionHeader, Skeleton, Card } from '@/components/ui';
import { OrderCard } from '@/features/orders/OrderCard';
import { useOrders } from '@/hooks/queries';
import { activeStatuses } from '@/constants/status.constants';
import { useAuth } from '@/store/auth.store';
import { useNotifications } from '@/store/notifications.store';
import { useRequestDraft } from '@/store/request.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import { firstName, greeting } from '@/utils/format';
import { byNewest, needsPayment } from '@/utils/orders';

export default function HomeScreen() {
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const user = useAuth((s) => s.user);
  const unread = useNotifications((s) => s.unreadCount);
  const resetDraft = useRequestDraft((s) => s.reset);
  const orders = useOrders();

  const all = [...(orders.data ?? [])].sort(byNewest);
  const active = all.filter((o) => activeStatuses.has(o.status));
  const pending = all.filter(needsPayment);
  const awaitingConfirm = all.filter((o) => o.status === 'PENDING_CUSTOMER_CONFIRMATION');

  const startRequest = () => {
    resetDraft();
    router.push('/request');
  };

  return (
    <Screen edges={['top']} refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>{greeting()}</Text>
          <Text style={typography.title} numberOfLines={1}>
            {firstName(user?.fullName) || 'Hola'}
          </Text>
        </View>
        <IconButton
          icon="notifications-outline"
          accessibilityLabel="Notificaciones"
          badge={unread}
          onPress={() => router.push('/notifications')}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Solicitar un envío"
        onPress={startRequest}
        style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="cube" size={26} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.heroTitle}>Solicitar un envío</Text>
          <Text style={styles.heroText}>Cotiza al instante y sigue al conductor en vivo.</Text>
        </View>
        <Ionicons name="arrow-forward" size={22} color={colors.onPrimary} />
      </Pressable>

      {pending.length > 0 || awaitingConfirm.length > 0 ? (
        <Card style={{ padding: 0, gap: 0 }}>
          {pending.length > 0 ? (
            <ListRow
              icon="card-outline"
              title={pending.length === 1 ? '1 envío por pagar' : `${pending.length} envíos por pagar`}
              subtitle="Paga para que empecemos a buscar conductor."
              onPress={() => router.push('/payments')}
            />
          ) : null}
          {awaitingConfirm.length > 0 ? (
            <ListRow
              icon="calendar-outline"
              title={`${awaitingConfirm.length} cotización(es) por aceptar`}
              subtitle="Operaciones te preparó una cotización."
              onPress={() => router.push('/reservations')}
            />
          ) : null}
        </Card>
      ) : null}

      <SectionHeader
        title="En curso"
        action={
          active.length > 0 ? (
            <Text style={styles.link} onPress={() => router.push('/orders')}>
              Ver todos
            </Text>
          ) : undefined
        }
      />
      {orders.isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={120} />
          <Skeleton height={120} />
        </View>
      ) : active.length === 0 ? (
        <EmptyState
          icon="navigate-outline"
          title="Sin envíos en curso"
          message="Cuando solicites un envío, lo verás aquí con su estado en tiempo real."
          action={<Button label="Solicitar envío" size="md" icon="add" onPress={startRequest} />}
        />
      ) : (
        active.slice(0, 4).map((order) => <OrderCard key={order.id} order={order} />)
      )}

      <Card style={{ padding: 0, gap: 0 }}>
        <ListRow icon="calendar-outline" title="Reservas programadas" onPress={() => router.push('/reservations')} />
        <ListRow icon="wallet-outline" title="Pagos" onPress={() => router.push('/payments')} />
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors, elevation }) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.xl,
      borderRadius: radius.xl,
      backgroundColor: colors.primary,
      ...elevation.raised,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: { color: colors.onPrimary, fontSize: 18, fontWeight: '700' },
    heroText: { color: colors.onPrimaryMuted, fontSize: 13 },
    link: { color: colors.primaryText, fontWeight: '700', fontSize: 13 },
  }),
);
