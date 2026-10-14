import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorBanner, Skeleton, Stat } from '@/components/ui';
import { OrderCard } from '@/features/orders/OrderCard';
import { useOrders } from '@/hooks/queries';
import { terminalStatuses } from '@/constants/status.constants';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import { friendlyError } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { byNewest } from '@/utils/orders';

export default function HistoryScreen() {
  const styles = useStyles();
  const { typography } = useTheme();
  const orders = useOrders();
  const closed = (orders.data ?? []).filter((o) => terminalStatuses.has(o.status)).sort(byNewest);
  const delivered = closed.filter((o) => o.status === 'DELIVERED');
  const spent = delivered.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <Screen edges={['top']} refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()}>
      <Text style={typography.title}>Historial</Text>
      <View style={styles.stats}>
        <Stat icon="checkmark-done-outline" value={String(delivered.length)} label="Entregados" />
        <Stat icon="close-circle-outline" value={String(closed.length - delivered.length)} label="Cancelados" />
        <Stat icon="cash-outline" value={formatMoney(spent)} label="Total" />
      </View>
      {orders.error ? <ErrorBanner message={friendlyError(orders.error)} onRetry={() => void orders.refetch()} /> : null}
      {orders.isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={130} />
          <Skeleton height={130} />
        </View>
      ) : closed.length === 0 ? (
        <EmptyState icon="time-outline" title="Aún no hay historial" message="Tus envíos entregados o cancelados aparecerán aquí." />
      ) : (
        closed.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </Screen>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    stats: { flexDirection: 'row', gap: spacing.sm },
  }),
);
