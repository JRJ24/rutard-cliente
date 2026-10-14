import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { paymentsApi } from '@/api/payments.api';
import { queryClient } from '@/api/query';
import { Button, Muted } from '@/components/ui';
import { useCustomerMe } from '@/hooks/queries';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/theme';
import type { TransportOrder } from '@/types/api';
import { friendlyError } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { orderTotal } from '@/utils/orders';
import { CHECK_NOTE, corporateCredit } from './credit';

/** Botones para pagar una orden pendiente: CardNET o credito corporativo. */
export function PayOrderActions({ order }: { order: TransportOrder }) {
  const customer = useCustomerMe();
  const credit = corporateCredit(customer.data);
  const total = orderTotal(order) ?? 0;
  const creditCovers = credit.usable && credit.available >= total;
  const byCheck = (order.notes ?? '').includes(CHECK_NOTE);

  const useCredit = useMutation({
    mutationFn: () => paymentsApi.createCorporateCreditPayment(order.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['customers', 'me'] });
      toast.success('Envío autorizado', 'Pagado con crédito corporativo.');
    },
    onError: (e) => toast.error('No se pudo usar el crédito', friendlyError(e)),
  });

  return (
    <View style={{ gap: spacing.sm }}>
      {byCheck ? <Muted>Elegiste pagar con cheque: operaciones autorizará el despacho al registrarlo.</Muted> : null}
      <Button
        label={`Pagar ${formatMoney(total)} con tarjeta`}
        icon="card-outline"
        onPress={() => router.push({ pathname: '/payments/cardnet', params: { orderId: order.id } })}
      />
      {credit.usable ? (
        <Button
          label={creditCovers ? 'Usar crédito corporativo' : `Crédito insuficiente (${formatMoney(credit.available)})`}
          variant="secondary"
          icon="business-outline"
          disabled={!creditCovers}
          loading={useCredit.isPending}
          onPress={() => useCredit.mutate()}
        />
      ) : null}
    </View>
  );
}
