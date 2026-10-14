import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Badge, Card, EmptyState, ErrorBanner, ListRow, Overline, Skeleton, Stat } from '@/components/ui';
import { paymentMethodLabels, paymentStatusLabels, toneForPayment } from '@/constants/status.constants';
import { PayOrderActions } from '@/features/payments/PayOrderActions';
import { useOrders } from '@/hooks/queries';
import { makeStyles } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import type { Payment, TransportOrder } from '@/types/api';
import { friendlyError } from '@/utils/errors';
import { formatMoney, formatRelativeDay } from '@/utils/format';
import { byNewest, needsPayment } from '@/utils/orders';

export default function PaymentsScreen() {
  const styles = useStyles();
  const orders = useOrders();
  const list = orders.data ?? [];
  const pending = list.filter(needsPayment).sort(byNewest);
  const payments: (Payment & { order: TransportOrder })[] = list
    .flatMap((order) => (order.payments ?? []).map((p) => ({ ...p, order })))
    .sort(byNewest);
  const paid = payments.filter((p) => p.status === 'PAID' || p.status === 'AUTHORIZED');
  const totalPaid = paid.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <Screen edges={['bottom']} refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()}>
      <View style={styles.stats}>
        <Stat icon="time-outline" value={String(pending.length)} label="Por pagar" />
        <Stat icon="checkmark-done-outline" value={String(paid.length)} label="Pagos" />
        <Stat icon="cash-outline" value={formatMoney(totalPaid)} label="Pagado" />
      </View>

      {orders.error ? <ErrorBanner message={friendlyError(orders.error)} onRetry={() => void orders.refetch()} /> : null}

      <Overline>Pendientes</Overline>
      {orders.isPending ? (
        <Skeleton height={140} />
      ) : pending.length === 0 ? (
        <EmptyState icon="checkmark-circle-outline" title="Nada por pagar" message="Todos tus envíos están al día." />
      ) : (
        pending.map((order) => (
          <Card key={order.id}>
            <View style={styles.head}>
              <Text style={styles.code} onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}>
                {order.orderCode}
              </Text>
              <Text style={styles.amount}>{formatMoney(order.totalAmount)}</Text>
            </View>
            <PayOrderActions order={order} />
          </Card>
        ))
      )}

      <Overline>Historial de pagos</Overline>
      {payments.length === 0 && !orders.isPending ? (
        <EmptyState icon="receipt-outline" title="Aún no hay pagos" />
      ) : (
        <Card style={{ padding: 0, gap: 0 }}>
          {payments.map((p) => (
            <ListRow
              key={p.id}
              icon={p.paymentMethod === 'CORPORATE_CREDIT' ? 'business-outline' : 'card-outline'}
              title={`${formatMoney(p.amount)} · ${p.order.orderCode}`}
              subtitle={`${paymentMethodLabels[p.paymentMethod] ?? p.paymentMethod} · ${formatRelativeDay(p.paidAt ?? p.createdAt)}`}
              right={<Badge label={paymentStatusLabels[p.status] ?? p.status} tone={toneForPayment(p.status)} />}
              onPress={() => router.push({ pathname: '/payments/receipt', params: { paymentId: p.id } })}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    stats: { flexDirection: 'row', gap: spacing.sm },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    code: { fontSize: 15, fontWeight: '700', color: colors.primaryText },
    amount: { fontSize: 16, fontWeight: '700', color: colors.text },
  }),
);
