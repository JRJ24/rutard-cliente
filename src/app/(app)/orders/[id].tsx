import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';
import { queryClient } from '@/api/query';
import { Screen } from '@/components/Screen';
import { StopTimeline } from '@/components/StopTimeline';
import { Badge, Button, Card, EmptyState, ErrorBanner, KeyValue, Muted, Overline, Skeleton } from '@/components/ui';
import {
  cancellableStatuses,
  orderStatusLabels,
  paymentStatusLabels,
  searchingStatuses,
  serviceLabels,
  terminalStatuses,
  toneForPayment,
  toneForStatus,
  trackableStatuses,
} from '@/constants/status.constants';
import { CancelOrderSheet } from '@/features/orders/CancelOrderSheet';
import { DriverCard } from '@/features/orders/DriverCard';
import { EvidenceSection } from '@/features/orders/EvidenceSection';
import { IncidentsSection } from '@/features/orders/IncidentsSection';
import { eventLabel, matchingMessage } from '@/features/orders/labels';
import { TrackingMap } from '@/features/orders/TrackingMap';
import { PayOrderActions } from '@/features/payments/PayOrderActions';
import { useLatestLocation, useOrder, useOrderApproach, useOrderEvents, useOrderRoute } from '@/hooks/queries';
import { useOrderLive } from '@/hooks/realtime';
import { toast } from '@/store/toast.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import { friendlyError } from '@/utils/errors';
import { formatDateTime, formatKm, formatMinutes, formatMoney, formatRelativeDay } from '@/utils/format';
import { toLatLng } from '@/utils/maps';
import { activeAssignment, byNewest, needsPayment, stopsForOrder } from '@/utils/orders';

export default function OrderDetailScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useOrder(id);
  const o = order.data;
  const status = o?.status;
  const live = Boolean(status && !terminalStatuses.has(status));
  const trackable = Boolean(status && trackableStatuses.has(status));

  const matching = useOrderLive(id, live);
  const route = useOrderRoute(id, Boolean(o));
  const approach = useOrderApproach(id, trackable);
  const location = useLatestLocation(id, trackable);
  const events = useOrderEvents(id);
  const [cancelOpen, setCancelOpen] = useState(false);

  const confirm = useMutation({
    mutationFn: () => ordersApi.confirmByCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Cotización aceptada', 'Ahora completa el pago.');
    },
    onError: (e) => toast.error('No se pudo aceptar', friendlyError(e)),
  });

  if (order.isPending) {
    return (
      <Screen edges={['bottom']}>
        <Skeleton height={260} />
        <Skeleton height={120} />
        <Skeleton height={160} />
      </Screen>
    );
  }
  if (order.error) {
    return (
      <Screen edges={['bottom']}>
        <ErrorBanner message={friendlyError(order.error)} onRetry={() => void order.refetch()} />
      </Screen>
    );
  }
  if (!o) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="search-outline" title="No encontramos este envío" />
        <Button label="Ver mis envíos" variant="secondary" onPress={() => router.replace('/orders')} />
      </Screen>
    );
  }

  const stops = stopsForOrder(o);
  const hasMap = stops.some((s) => toLatLng(s));
  const assignment = activeAssignment(o);
  const pay = needsPayment(o);
  const searching = searchingStatuses.has(o.status);
  const approachMin = approach.data?.route?.durationMin;
  const etaText =
    approachMin != null
      ? approach.data?.targetStopType === 'DROPOFF'
        ? `Llega a la entrega en ${formatMinutes(approachMin)}`
        : `Llega a recoger en ${formatMinutes(approachMin)}`
      : null;
  const timeline = [...(events.data ?? o.orderEvents ?? [])].sort(byNewest);

  return (
    <Screen
      edges={['bottom']}
      refreshing={order.isRefetching}
      onRefresh={() => {
        void order.refetch();
        void events.refetch();
      }}
    >
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.code}>{o.orderCode}</Text>
          <Muted>Creada {formatRelativeDay(o.createdAt)}</Muted>
        </View>
        <Badge
          label={pay ? 'Pago pendiente' : orderStatusLabels[o.status]}
          tone={pay ? 'warning' : toneForStatus(o.status)}
          pulse={searching || o.status === 'IN_PROGRESS'}
        />
      </View>

      {searching ? (
        <Card style={styles.searching}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.searchingText}>{matchingMessage(matching, o.status)}</Text>
        </Card>
      ) : null}

      {o.status === 'PENDING_CUSTOMER_CONFIRMATION' ? (
        <Card>
          <Overline>Cotización de operaciones</Overline>
          <Text style={styles.total}>{formatMoney(o.totalAmount)}</Text>
          <Muted>Revisa los datos y acepta para pasar al pago.</Muted>
          <Button label="Aceptar cotización" icon="checkmark" loading={confirm.isPending} onPress={() => confirm.mutate()} />
        </Card>
      ) : null}

      {pay ? (
        <Card>
          <Overline>Pago</Overline>
          <Muted>Empezamos a buscar conductor en cuanto se confirme el pago.</Muted>
          <PayOrderActions order={o} />
        </Card>
      ) : null}

      {hasMap ? (
        <TrackingMap
          stops={stops}
          route={route.data}
          approach={trackable ? approach.data?.route : null}
          driver={trackable ? location.data : null}
        />
      ) : null}

      {assignment ? <DriverCard assignment={assignment} etaText={o.status === 'IN_PROGRESS' || o.status === 'ACCEPTED' ? etaText : null} /> : null}

      <Card>
        <Overline>Ruta</Overline>
        <StopTimeline stops={stops} />
      </Card>

      <Card>
        <Overline>Resumen</Overline>
        <KeyValue label="Servicio" value={serviceLabels[o.serviceType] ?? o.serviceType} />
        {o.scheduleAt ? <KeyValue label="Programada para" value={formatDateTime(o.scheduleAt)} /> : null}
        <KeyValue label="Distancia" value={formatKm(o.distanceKm)} />
        <KeyValue label="Tiempo estimado" value={formatMinutes(o.estimatedDurationMin)} />
        <KeyValue label="Total" value={formatMoney(o.totalAmount)} />
        <View style={styles.kvRow}>
          <Muted>Pago</Muted>
          <Badge label={paymentStatusLabels[o.paymentStatus] ?? o.paymentStatus} tone={toneForPayment(o.paymentStatus)} />
        </View>
        {o.deliveredAt ? <KeyValue label="Entregado" value={formatDateTime(o.deliveredAt)} /> : null}
      </Card>

      {(o.orderItems ?? []).length > 0 ? (
        <Card>
          <Overline>Carga</Overline>
          {(o.orderItems ?? []).map((item) => (
            <View key={item.id} style={{ gap: 2 }}>
              <Text style={styles.itemTitle}>
                {item.quantity} × {item.description}
              </Text>
              <Muted>
                {Number(item.weightKg)} kg c/u
                {item.volumeM3 ? ` · ${Number(item.volumeM3)} m³` : ''}
                {item.fragile ? ' · Frágil' : ''}
                {item.requireHelper ? ' · Con ayudante' : ''}
              </Muted>
            </View>
          ))}
        </Card>
      ) : null}

      {o.status === 'DELIVERED' ? <EvidenceSection orderId={o.id} /> : null}

      <IncidentsSection orderId={o.id} canReport={o.status !== 'CANCELLED'} />

      {timeline.length > 0 ? (
        <Card>
          <Overline>Actividad</Overline>
          {timeline.map((event) => (
            <View key={event.id} style={styles.event}>
              <View style={styles.dot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{eventLabel(event)}</Text>
                <Muted>{formatRelativeDay(event.createdAt)}</Muted>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {cancellableStatuses.has(o.status) ? (
        <Button label="Cancelar envío" variant="ghost" icon="close-circle-outline" onPress={() => setCancelOpen(true)} />
      ) : null}
      <CancelOrderSheet order={o} visible={cancelOpen} onClose={() => setCancelOpen(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    code: { fontSize: 20, fontWeight: '700', color: colors.text },
    searching: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft },
    searchingText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primaryText },
    total: { fontSize: 24, fontWeight: '700', color: colors.text },
    kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    event: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  }),
);
