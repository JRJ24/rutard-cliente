import { Screen } from '@/components/Screen';
import { EmptyState, ErrorBanner, Muted, Skeleton } from '@/components/ui';
import { OrderCard } from '@/features/orders/OrderCard';
import { useOrders } from '@/hooks/queries';
import { friendlyError } from '@/utils/errors';

/**
 * Ordenes programadas (`serviceType=SCHEDULED`), incluidas las cotizaciones
 * que prepara operaciones y el cliente acepta desde el detalle.
 */
export default function ReservationsScreen() {
  const orders = useOrders({ serviceType: 'SCHEDULED' });
  const list = [...(orders.data ?? [])].sort((a, b) => {
    const at = new Date(a.scheduleAt ?? a.createdAt).getTime();
    const bt = new Date(b.scheduleAt ?? b.createdAt).getTime();
    return bt - at;
  });

  return (
    <Screen edges={['bottom']} refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()}>
      <Muted>Puedes cancelar una reserva hasta 1 hora antes de la recogida.</Muted>
      {orders.error ? <ErrorBanner message={friendlyError(orders.error)} onRetry={() => void orders.refetch()} /> : null}
      {orders.isPending ? (
        <Skeleton height={130} />
      ) : list.length === 0 ? (
        <EmptyState icon="calendar-outline" title="Sin reservas" message="Programa un envío eligiendo «Programar» al solicitarlo." />
      ) : (
        list.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </Screen>
  );
}
