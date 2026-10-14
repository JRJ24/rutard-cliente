import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import { queryClient, queryKeys } from '@/api/query';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, EmptyState, ErrorBanner, KeyValue, ListRow, Muted, Overline, Stat, TextField } from '@/components/ui';
import { useCreditMovements, useCustomerMe } from '@/hooks/queries';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/theme';
import type { CreditAccountStatus } from '@/types/api';
import { friendlyError } from '@/utils/errors';
import { formatDate, formatMoney, formatRelativeDay } from '@/utils/format';
import { numberFromInput } from '@/utils/validation';
import type { Tone } from '@/components/ui';

const STATUS: Record<CreditAccountStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'En revisión', tone: 'warning' },
  ACTIVE: { label: 'Activa', tone: 'success' },
  BLOCKED: { label: 'Bloqueada', tone: 'danger' },
  REJECTED: { label: 'Rechazada', tone: 'danger' },
  CLOSED: { label: 'Cerrada', tone: 'neutral' },
};

const MOVEMENTS: Record<string, string> = {
  AUTHORIZATION: 'Envío autorizado',
  PAYMENT: 'Pago recibido',
  CLOSED: 'Cierre',
  ADJUSTMENT: 'Ajuste',
  REFUND: 'Reembolso',
};

export default function CreditScreen() {
  const customer = useCustomerMe();
  const account = customer.data?.creditAccount;
  const business = customer.data?.customerType === 'BUSINESS';
  const [page, setPage] = useState(1);
  const movements = useCreditMovements(page, Boolean(account));
  const [limit, setLimit] = useState('');
  const [days, setDays] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);

  const requested = numberFromInput(limit);
  const creditDays = numberFromInput(days);
  const limitError =
    !(requested >= 1)
      ? 'Indica el límite que necesitas.'
      : account && requested <= account.creditLimit
        ? `Debe ser mayor que tu límite actual (${formatMoney(account.creditLimit)}).`
        : null;
  const daysError = days.trim() && !(Number.isInteger(creditDays) && creditDays >= 1) ? 'Días inválidos.' : null;

  const request = useMutation({
    mutationFn: () =>
      customersApi.requestCredit({
        requestedLimit: requested,
        ...(days.trim() ? { creditDays } : {}),
        ...(notes.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerMe });
      setLimit('');
      setDays('');
      setNotes('');
      setTouched(false);
      toast.success('Solicitud enviada', 'Operaciones revisará tu línea de crédito.');
    },
  });

  if (!business) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="business-outline"
          title="Solo para empresas"
          message="Cambia tu tipo de cliente a Empresa en Datos fiscales para solicitar crédito."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']} refreshing={customer.isRefetching} onRefresh={() => void customer.refetch()}>
      {account ? (
        <>
          <View style={styles.stats}>
            <Stat value={formatMoney(account.creditLimit)} label="Límite" />
            <Stat value={formatMoney(account.balanceUsed)} label="Usado" />
            <Stat value={formatMoney(Math.max(0, account.creditLimit - account.balanceUsed))} label="Disponible" />
          </View>
          <Card>
            <View style={styles.row}>
              <Overline>Línea de crédito</Overline>
              <Badge label={STATUS[account.status].label} tone={STATUS[account.status].tone} />
            </View>
            <KeyValue label="Plazo" value={`${account.creditDays} días`} />
            {account.approvedAt ? <KeyValue label="Aprobada" value={formatDate(account.approvedAt)} /> : null}
          </Card>
        </>
      ) : (
        <Muted>Con una línea de crédito tu empresa paga los envíos a plazo, sin tarjeta.</Muted>
      )}

      <Card>
        <Overline>{account ? 'Solicitar aumento' : 'Solicitar crédito'}</Overline>
        <TextField
          label="Límite solicitado (RD$)"
          keyboardType="decimal-pad"
          value={limit}
          onChangeText={setLimit}
          error={touched ? limitError : null}
        />
        <TextField label="Días de crédito (opcional)" keyboardType="number-pad" value={days} onChangeText={setDays} error={touched ? daysError : null} />
        <TextField label="Notas (opcional)" value={notes} onChangeText={setNotes} maxLength={500} multiline />
        {request.error ? <ErrorBanner message={friendlyError(request.error)} /> : null}
        <Button
          label="Enviar solicitud"
          icon="send"
          size="md"
          loading={request.isPending}
          disabled={account?.status === 'PENDING'}
          onPress={() => {
            setTouched(true);
            if (!limitError && !daysError) request.mutate();
          }}
        />
        {account?.status === 'PENDING' ? <Muted>Ya tienes una solicitud en revisión.</Muted> : null}
      </Card>

      {account ? (
        <>
          <Overline>Movimientos</Overline>
          <Card style={{ padding: 0, gap: 0 }}>
            {(movements.data?.items ?? []).length === 0 ? (
              <ListRow title="Sin movimientos" />
            ) : (
              (movements.data?.items ?? []).map((m) => (
                <ListRow
                  key={m.id}
                  icon={m.movementType === 'PAYMENT' || m.movementType === 'REFUND' ? 'arrow-down-outline' : 'arrow-up-outline'}
                  title={`${MOVEMENTS[m.movementType] ?? m.movementType} · ${formatMoney(m.amount)}`}
                  subtitle={`${m.orderCode ?? ''}${m.orderCode ? ' · ' : ''}${formatRelativeDay(m.createdAt)} · Saldo ${formatMoney(m.balanceAfter)}`}
                />
              ))
            )}
          </Card>
          {movements.data && movements.data.totalPages > 1 ? (
            <View style={styles.row}>
              <Button label="Anterior" variant="secondary" size="md" disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
              <Muted>
                {page} / {movements.data.totalPages}
              </Muted>
              <Button
                label="Siguiente"
                variant="secondary"
                size="md"
                disabled={page >= movements.data.totalPages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
});
