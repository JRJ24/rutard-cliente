import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';
import { paymentsApi } from '@/api/payments.api';
import { pricingApi } from '@/api/pricing.api';
import { queryClient } from '@/api/query';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, EmptyState, ErrorBanner, KeyValue, Muted, Overline, Skeleton } from '@/components/ui';
import { CHECK_NOTE, corporateCredit } from '@/features/payments/credit';
import { fullAddress } from '@/features/request/resolveAddress';
import { useCustomerMe } from '@/hooks/queries';
import { useRequestDraft, type PaymentChoice } from '@/store/request.store';
import { toast } from '@/store/toast.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import type { QuoteOption } from '@/types/api';
import { friendlyError } from '@/utils/errors';
import { formatDateTime, formatKm, formatMinutes, formatMoney } from '@/utils/format';
import { numberFromInput } from '@/utils/validation';
import type { IconName } from '@/components/ui';

const PAYMENT_OPTIONS: { key: PaymentChoice; label: string; hint: string; icon: IconName }[] = [
  { key: 'CARD', label: 'Tarjeta', hint: 'Pago seguro con CardNET.', icon: 'card-outline' },
  { key: 'CORPORATE_CREDIT', label: 'Crédito corporativo', hint: 'Se descuenta de tu línea aprobada.', icon: 'business-outline' },
  { key: 'CHECK', label: 'Cheque', hint: 'Operaciones despacha cuando registre el cheque.', icon: 'document-text-outline' },
];

function unavailableLabel(option: QuoteOption): string | null {
  if (option.unavailable === 'CAPACITY' || !option.fits) return 'No cabe tu carga';
  if (option.unavailable === 'NO_RATE' || option.totalAmount == null) return 'Sin tarifa disponible';
  return null;
}

export default function VehicleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const draft = useRequestDraft();
  const { route, item, pickup, dropoff } = draft;
  const customer = useCustomerMe();
  const credit = corporateCredit(customer.data);

  const quantity = Math.max(1, Math.round(numberFromInput(item.quantity) || 1));
  const weightKg = numberFromInput(item.weightKg);
  const volumeM3 = numberFromInput(item.volumeM3);

  // Precio de cada categoria: no persiste nada en la API.
  const options = useQuery({
    queryKey: ['pricing', 'quote-options', route?.distanceKm, route?.estimatedDurationMin, quantity, weightKg, volumeM3, item.requireHelper],
    enabled: Boolean(route && pickup.location),
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      pricingApi.quoteOptions(
        {
          distanceKm: route!.distanceKm,
          estimatedDurationMin: route!.estimatedDurationMin,
          weightKg: Number.isFinite(weightKg) ? weightKg : undefined,
          volumeM3: Number.isFinite(volumeM3) ? volumeM3 : undefined,
          quantity,
          requireHelper: item.requireHelper,
          originLatitude: pickup.location!.latitude,
          originLongitude: pickup.location!.longitude,
        },
        signal,
      ),
  });

  const selected = useMemo(
    () => options.data?.find((o) => o.vehicleCategoryId === draft.vehicleCategoryId && !unavailableLabel(o)) ?? null,
    [options.data, draft.vehicleCategoryId],
  );

  // Preselecciona la opcion mas barata que sirve.
  useEffect(() => {
    if (!options.data || selected) return;
    const best = options.data
      .filter((o) => !unavailableLabel(o))
      .sort((a, b) => (a.totalAmount ?? Infinity) - (b.totalAmount ?? Infinity))[0];
    if (best) draft.set({ vehicleCategoryId: best.vehicleCategoryId });
  }, [options.data, selected, draft]);

  const creditCovers = credit.usable && selected?.totalAmount != null && credit.available >= selected.totalAmount;
  useEffect(() => {
    if (draft.payment === 'CORPORATE_CREDIT' && !creditCovers && selected) draft.set({ payment: 'CARD' });
  }, [draft, creditCovers, selected]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!route || !pickup.location || !dropoff.location || !selected) throw new Error('Faltan datos del envío.');
      const originAddress = fullAddress(pickup.location).slice(0, 180);
      const destinationAddress = fullAddress(dropoff.location).slice(0, 180);
      // La cotizacion que se cobra se crea al enviar (vence a los 15 min).
      const quote = await pricingApi.createQuote({
        vehicleCategoryId: selected.vehicleCategoryId,
        originAddress,
        destinationAddress,
        distanceKm: Math.max(0.1, route.distanceKm),
        estimatedDurationMin: Math.max(1, Math.round(route.estimatedDurationMin)),
        requireHelper: item.requireHelper,
        originLatitude: pickup.location.latitude,
        originLongitude: pickup.location.longitude,
      });
      const notes = [draft.notes.trim(), draft.payment === 'CHECK' ? CHECK_NOTE : ''].filter(Boolean).join('\n').slice(0, 500);
      const stop = (target: 'pickup' | 'dropoff', sequence: number) => {
        const s = draft[target];
        const loc = s.location!;
        return {
          stopType: target === 'pickup' ? ('PICKUP' as const) : ('DROPOFF' as const),
          sequence,
          contactName: s.contactName.trim(),
          contactPhone: s.contactPhone.trim(),
          addressLine: loc.addressLine,
          city: loc.city,
          province: loc.province,
          latitude: loc.latitude,
          longitude: loc.longitude,
          ...(s.instructions.trim() ? { instructions: s.instructions.trim().slice(0, 240) } : {}),
        };
      };
      const declared = numberFromInput(item.declaredValue);
      return ordersApi.create({
        quoteId: quote.id,
        serviceType: draft.serviceType,
        ...(draft.serviceType === 'SCHEDULED' && draft.scheduleAt ? { scheduleAt: draft.scheduleAt.toISOString() } : {}),
        ...(notes ? { notes } : {}),
        stops: [stop('pickup', 1), stop('dropoff', 2)],
        items: [
          {
            description: item.description.trim(),
            quantity,
            weightKg,
            ...(Number.isFinite(volumeM3) ? { volumeM3 } : {}),
            ...(Number.isFinite(declared) ? { declaredValue: declared } : {}),
            fragile: item.fragile,
            requireHelper: item.requireHelper,
          },
        ],
      });
    },
    onSuccess: async (order) => {
      const payment = draft.payment;
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      draft.reset();
      // Se cierra el flujo de solicitud: queda el detalle de la orden.
      router.dismissAll();
      router.push({ pathname: '/orders/[id]', params: { id: order.id } });
      if (payment === 'CARD') {
        router.push({ pathname: '/payments/cardnet', params: { orderId: order.id } });
        return;
      }
      if (payment === 'CORPORATE_CREDIT') {
        try {
          await paymentsApi.createCorporateCreditPayment(order.id);
          void queryClient.invalidateQueries({ queryKey: ['orders'] });
          void queryClient.invalidateQueries({ queryKey: ['customers', 'me'] });
          toast.success('Envío autorizado', 'Pagado con crédito corporativo. Buscando conductor.');
        } catch (e) {
          toast.error('No se pudo usar el crédito', friendlyError(e));
        }
        return;
      }
      toast.success(`Orden ${order.orderCode} creada`, 'Operaciones autorizará el despacho al registrar el cheque.');
    },
  });

  if (!route) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="map-outline" title="Falta la ruta" message="Vuelve y elige la recogida y la entrega." />
      </Screen>
    );
  }

  return (
    <Screen
      edges={['bottom']}
      footer={
        <>
          {selected?.totalAmount != null ? (
            <View style={styles.total}>
              <Text style={styles.totalAmount}>{formatMoney(selected.totalAmount)}</Text>
              <Muted>{selected.name} · ITBIS incluido</Muted>
            </View>
          ) : null}
          {submit.error ? <ErrorBanner message={friendlyError(submit.error, 'No se pudo crear el envío.')} /> : null}
          <Button
            label={selected ? `Solicitar ${selected.name}` : 'Elige un vehículo'}
            icon="checkmark-circle-outline"
            disabled={!selected}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
        </>
      }
    >
      <Card>
        <KeyValue label="Distancia" value={formatKm(route.distanceKm)} />
        <KeyValue label="Tiempo estimado" value={formatMinutes(route.estimatedDurationMin)} />
        {draft.serviceType === 'SCHEDULED' && draft.scheduleAt ? (
          <KeyValue label="Recogida programada" value={formatDateTime(draft.scheduleAt)} />
        ) : null}
        {route.distanceSource === 'straight-line' ? (
          <Muted>Distancia aproximada en línea recta: el mapa no respondió.</Muted>
        ) : null}
      </Card>

      <Overline>Vehículo</Overline>
      {options.isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={84} />
          <Skeleton height={84} />
          <Skeleton height={84} />
        </View>
      ) : options.error ? (
        <ErrorBanner message={friendlyError(options.error, 'No pudimos cotizar.')} onRetry={() => void options.refetch()} />
      ) : (
        (options.data ?? []).map((option) => {
          const blocked = unavailableLabel(option);
          const active = option.vehicleCategoryId === selected?.vehicleCategoryId;
          return (
            <Pressable
              key={option.vehicleCategoryId}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: Boolean(blocked) }}
              disabled={Boolean(blocked)}
              onPress={() => draft.set({ vehicleCategoryId: option.vehicleCategoryId })}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                blocked ? { opacity: 0.5 } : null,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.optionIcon, active && { backgroundColor: colors.primary }]}>
                <Ionicons name="car-outline" size={22} color={active ? colors.onPrimary : colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.optionName}>{option.name}</Text>
                <Muted>
                  Hasta {Number(option.maxWeightKg)} kg · {Number(option.maxVolumenM3)} m³
                </Muted>
                {option.baseCapacityNote ? <Muted>{option.baseCapacityNote}</Muted> : null}
              </View>
              {blocked ? (
                <Badge label={blocked} tone="neutral" />
              ) : (
                <Text style={styles.optionPrice}>{formatMoney(option.totalAmount)}</Text>
              )}
            </Pressable>
          );
        })
      )}

      <Overline>Pago</Overline>
      {PAYMENT_OPTIONS.filter((p) => p.key !== 'CORPORATE_CREDIT' || credit.usable).map((p) => {
        const active = draft.payment === p.key;
        const disabled = p.key === 'CORPORATE_CREDIT' && !creditCovers;
        return (
          <Pressable
            key={p.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => draft.set({ payment: p.key })}
            style={[styles.option, active && styles.optionActive, disabled && { opacity: 0.5 }]}
          >
            <Ionicons name={p.icon} size={22} color={active ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionName}>{p.label}</Text>
              <Muted>
                {p.key === 'CORPORATE_CREDIT'
                  ? disabled
                    ? `Disponible ${formatMoney(credit.available)}: no cubre este envío.`
                    : `Disponible ${formatMoney(credit.available)} · ${credit.days} días.`
                  : p.hint}
              </Muted>
            </View>
            <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.textDim} />
          </Pressable>
        );
      })}
      <Muted>El precio queda fijo al solicitar. Incluye ITBIS.</Muted>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors, elevation }) =>
  StyleSheet.create({
    total: { alignItems: 'center', gap: 2 },
    totalAmount: { fontSize: 22, fontWeight: '700', color: colors.text },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...elevation.card,
    },
    optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionName: { fontSize: 15, fontWeight: '700', color: colors.text },
    optionPrice: { fontSize: 16, fontWeight: '700', color: colors.text },
  }),
);
