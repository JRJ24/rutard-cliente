import { useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';
import { queryClient } from '@/api/query';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Sheet } from '@/components/Sheet';
import { Button, ErrorBanner, Muted, TextField } from '@/components/ui';
import { useCancellationFee } from '@/hooks/queries';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/theme';
import type { TransportOrder } from '@/types/api';
import { friendlyError } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { isOrderPaid } from '@/utils/orders';

const REASONS = ['Ya no lo necesito', 'Cambié la dirección', 'Tarda demasiado', 'Otro motivo'] as const;
type Reason = (typeof REASONS)[number];

export function CancelOrderSheet({
  order,
  visible,
  onClose,
}: {
  order: TransportOrder;
  visible: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<Reason>(REASONS[0]);
  const [other, setOther] = useState('');
  const fee = useCancellationFee(order.id, visible && isOrderPaid(order));

  const cancel = useMutation({
    mutationFn: () =>
      ordersApi.cancel(order.id, {
        cancellationType: 'CUSTOMER_CANCELLED',
        reason: (reason === 'Otro motivo' ? other.trim() || reason : reason).slice(0, 300),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Envío cancelado');
      onClose();
    },
  });

  return (
    <Sheet visible={visible} onClose={onClose} title="Cancelar envío" subtitle={order.orderCode}>
      <View style={{ gap: spacing.md }}>
        <ChoiceChips<Reason>
          label="Motivo"
          value={reason}
          choices={REASONS.map((r) => ({ key: r, label: r }))}
          onChange={setReason}
        />
        {reason === 'Otro motivo' ? (
          <TextField label="Cuéntanos" value={other} onChangeText={setOther} maxLength={300} multiline />
        ) : null}
        {fee.data?.feeApplied ? (
          <Muted>
            Cargo por cancelación: {formatMoney(fee.data.feeAmount)}. Reembolso estimado: {formatMoney(fee.data.refundAmount)}.
          </Muted>
        ) : isOrderPaid(order) ? (
          <Muted>El reembolso de tu pago lo gestiona operaciones.</Muted>
        ) : null}
        {cancel.error ? <ErrorBanner message={friendlyError(cancel.error)} /> : null}
        <Button label="Cancelar envío" variant="danger" icon="close-circle-outline" loading={cancel.isPending} onPress={() => cancel.mutate()} />
        <Button label="Volver" variant="secondary" onPress={onClose} />
      </View>
    </Sheet>
  );
}
