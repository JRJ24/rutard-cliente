import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, EmptyState, ErrorBanner, KeyValue, Skeleton } from '@/components/ui';
import { paymentStatusLabels, toneForPayment } from '@/constants/status.constants';
import { useReceipt } from '@/hooks/queries';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import { friendlyError } from '@/utils/errors';
import { formatDateTime, formatMoney } from '@/utils/format';

export default function ReceiptScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const receipt = useReceipt(paymentId);
  const r = receipt.data;
  const ok = r?.status === 'PAID' || r?.status === 'AUTHORIZED';

  if (!paymentId) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="receipt-outline" title="Sin comprobante" message="La respuesta no incluyó un pago." />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']} refreshing={receipt.isRefetching} onRefresh={() => void receipt.refetch()}>
      {receipt.isPending ? (
        <Skeleton height={240} />
      ) : receipt.error ? (
        <ErrorBanner message={friendlyError(receipt.error)} onRetry={() => void receipt.refetch()} />
      ) : r ? (
        <>
          <View style={styles.hero}>
            <Ionicons
              name={ok ? 'checkmark-circle' : 'alert-circle'}
              size={56}
              color={ok ? colors.success : colors.warning}
            />
            <Text style={styles.amount}>{formatMoney(r.amount)}</Text>
            <Badge label={paymentStatusLabels[r.status] ?? r.status} tone={toneForPayment(r.status)} />
          </View>
          <Card>
            <KeyValue label="Orden" value={r.orderCode ?? r.orderId} />
            <KeyValue label="Tarjeta" value={r.maskedCardNumber ?? '--'} />
            <KeyValue label="Autorización" value={r.authorizationCode ?? '--'} />
            <KeyValue label="Referencia" value={r.retrievalReferenceNumber ?? r.providerReference ?? '--'} />
            <KeyValue label="Código de respuesta" value={r.responseCode ?? '--'} />
            <KeyValue label="Fecha" value={formatDateTime(r.paidAt ?? r.verifiedAt ?? r.createdAt)} />
          </Card>
          <Button
            label="Ver envío"
            icon="cube-outline"
            onPress={() => router.replace({ pathname: '/orders/[id]', params: { id: r.orderId } })}
          />
          {!ok ? (
            <Button
              label="Intentar de nuevo"
              variant="secondary"
              icon="card-outline"
              onPress={() => router.replace({ pathname: '/payments/cardnet', params: { orderId: r.orderId } })}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
    amount: { fontSize: 28, fontWeight: '700', color: colors.text },
  }),
);
