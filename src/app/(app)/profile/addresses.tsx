import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import { queryClient, queryKeys } from '@/api/query';
import { Screen } from '@/components/Screen';
import { ActionSheet, ConfirmSheet } from '@/components/Sheet';
import { Badge, Button, Card, EmptyState, ErrorBanner, ListRow, Skeleton } from '@/components/ui';
import { useAddresses } from '@/hooks/queries';
import { toast } from '@/store/toast.store';
import type { CustomerAddress } from '@/types/api';
import { friendlyError } from '@/utils/errors';

export default function AddressesScreen() {
  const addresses = useAddresses();
  const [selected, setSelected] = useState<CustomerAddress | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomerAddress | null>(null);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.customerAddresses });
  const makeDefault = useMutation({
    mutationFn: (id: string) => customersApi.updateAddress(id, { isDefault: true }),
    onSuccess: refresh,
    onError: (e) => toast.error('No se pudo actualizar', friendlyError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => customersApi.deleteAddress(id),
    onSuccess: () => {
      refresh();
      toast.success('Dirección eliminada');
    },
    onError: (e) => toast.error('No se pudo eliminar', friendlyError(e)),
  });

  return (
    <Screen
      edges={['bottom']}
      refreshing={addresses.isRefetching}
      onRefresh={() => void addresses.refetch()}
      footer={<Button label="Agregar dirección" icon="add" onPress={() => router.push('/profile/address')} />}
    >
      {addresses.error ? <ErrorBanner message={friendlyError(addresses.error)} onRetry={() => void addresses.refetch()} /> : null}
      {addresses.isPending ? (
        <Skeleton height={160} />
      ) : (addresses.data ?? []).length === 0 ? (
        <EmptyState icon="location-outline" title="Sin direcciones guardadas" message="Guarda tu casa, oficina o almacén para pedir más rápido." />
      ) : (
        <Card style={{ padding: 0, gap: 0 }}>
          {(addresses.data ?? []).map((a) => (
            <ListRow
              key={a.id}
              icon={a.isDefault ? 'star' : 'bookmark-outline'}
              title={a.label}
              subtitle={`${a.addressLine}, ${a.city}, ${a.province}`}
              right={a.isDefault ? <Badge label="Principal" tone="primary" /> : undefined}
              onPress={() => setSelected(a)}
            />
          ))}
        </Card>
      )}

      <ActionSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.label ?? ''}
        subtitle={selected?.addressLine}
        options={[
          { key: 'edit', label: 'Editar', icon: 'create-outline' },
          ...(selected?.isDefault ? [] : [{ key: 'default', label: 'Usar como principal', icon: 'star-outline' as const }]),
          { key: 'delete', label: 'Eliminar', icon: 'trash-outline', tone: 'danger' as const },
        ]}
        onSelect={(key) => {
          const a = selected;
          if (!a) return;
          if (key === 'edit') router.push({ pathname: '/profile/address', params: { id: a.id } });
          if (key === 'default') makeDefault.mutate(a.id);
          if (key === 'delete') setConfirmDelete(a);
        }}
      />
      <ConfirmSheet
        visible={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
        title="¿Eliminar dirección?"
        message={confirmDelete ? `${confirmDelete.label}: ${confirmDelete.addressLine}` : ''}
        confirmLabel="Eliminar"
        danger
        icon="trash-outline"
      />
    </Screen>
  );
}
