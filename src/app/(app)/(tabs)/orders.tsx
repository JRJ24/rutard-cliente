import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Button, EmptyState, ErrorBanner, Skeleton } from '@/components/ui';
import { OrderCard } from '@/features/orders/OrderCard';
import { useOrders } from '@/hooks/queries';
import { terminalStatuses } from '@/constants/status.constants';
import { useRequestDraft } from '@/store/request.store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import { friendlyError } from '@/utils/errors';
import { byNewest, trackingPriority } from '@/utils/orders';

type Tab = 'active' | 'closed';

export default function OrdersScreen() {
  const { typography } = useTheme();
  const [tab, setTab] = useState<Tab>('active');
  const orders = useOrders();
  const reset = useRequestDraft((s) => s.reset);
  const all = orders.data ?? [];
  const active = all
    .filter((o) => !terminalStatuses.has(o.status))
    .sort((a, b) => trackingPriority(a) - trackingPriority(b) || byNewest(a, b));
  const closed = all.filter((o) => terminalStatuses.has(o.status)).sort(byNewest);
  const list = tab === 'active' ? active : closed;

  return (
    <Screen edges={['top']} refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()}>
      <Text style={typography.title}>Mis envíos</Text>
      <SegmentedControl<Tab>
        segments={[
          { key: 'active', label: 'En curso', count: active.length },
          { key: 'closed', label: 'Cerrados', count: closed.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {orders.error ? <ErrorBanner message={friendlyError(orders.error)} onRetry={() => void orders.refetch()} /> : null}
      {orders.isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={130} />
          <Skeleton height={130} />
          <Skeleton height={130} />
        </View>
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === 'active' ? 'cube-outline' : 'archive-outline'}
          title={tab === 'active' ? 'Sin envíos en curso' : 'Sin envíos cerrados'}
          action={
            tab === 'active' ? (
              <Button
                label="Solicitar envío"
                size="md"
                icon="add"
                onPress={() => {
                  reset();
                  router.push('/request');
                }}
              />
            ) : undefined
          }
        />
      ) : (
        list.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </Screen>
  );
}
