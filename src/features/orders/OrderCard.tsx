import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Card } from '@/components/ui';
import { StopTimeline } from '@/components/StopTimeline';
import { orderStatusLabels, searchingStatuses, serviceLabels, toneForStatus } from '@/constants/status.constants';
import { makeStyles } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import type { TransportOrder } from '@/types/api';
import { formatDateTime, formatMoney, formatRelativeDay } from '@/utils/format';
import { activeAssignment, needsPayment, stopsForOrder } from '@/utils/orders';

export function OrderCard({ order }: { order: TransportOrder }) {
  const styles = useStyles();
  const assignment = activeAssignment(order);
  const stops = stopsForOrder(order);
  const pay = needsPayment(order);
  return (
    <Card
      accessibilityLabel={`Envío ${order.orderCode}, ${orderStatusLabels[order.status]}`}
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
    >
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.code}>{order.orderCode}</Text>
          <Text style={styles.meta}>
            {order.serviceType === 'SCHEDULED' && order.scheduleAt
              ? `${serviceLabels.SCHEDULED} · ${formatDateTime(order.scheduleAt)}`
              : formatRelativeDay(order.createdAt)}
          </Text>
        </View>
        <Text style={styles.amount}>{formatMoney(order.totalAmount)}</Text>
      </View>
      <Badge
        label={pay ? 'Pago pendiente' : orderStatusLabels[order.status]}
        tone={pay ? 'warning' : toneForStatus(order.status)}
        pulse={searchingStatuses.has(order.status) || order.status === 'IN_PROGRESS'}
      />
      {stops.length > 0 ? <StopTimeline stops={stops} compact /> : null}
      {assignment?.driverName ? (
        <Text style={styles.meta} numberOfLines={1}>
          {assignment.driverName}
          {assignment.vehiclePlate ? ` · ${assignment.vehicleLabel ?? ''} ${assignment.vehiclePlate}` : ''}
        </Text>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    code: { fontSize: 15, fontWeight: '700', color: colors.text },
    meta: { fontSize: 13, color: colors.textMuted },
    amount: { fontSize: 15, fontWeight: '700', color: colors.text },
  }),
);
