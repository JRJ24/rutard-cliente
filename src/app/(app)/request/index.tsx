import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mapsApi } from '@/api/maps.api';
import { ChoiceChips } from '@/components/ChoiceChips';
import { minScheduleDate, ScheduleField } from '@/components/ScheduleField';
import { Screen } from '@/components/Screen';
import { Button, Card, ErrorBanner, Muted, Overline, TextField } from '@/components/ui';
import { fullAddress } from '@/features/request/resolveAddress';
import { useAuth } from '@/store/auth.store';
import { useRequestDraft, type StopDraft } from '@/store/request.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import type { ServiceType } from '@/types/api';
import { friendlyError } from '@/utils/errors';
import { cleanPhone, formatKm, formatMinutes } from '@/utils/format';
import { numberFromInput, phoneError } from '@/utils/validation';

type Target = 'pickup' | 'dropoff';

function stopErrors(stop: StopDraft) {
  const errors: { location?: string; contactName?: string; contactPhone?: string } = {};
  if (!stop.location) errors.location = 'Elige la dirección.';
  if (stop.contactName.trim().length < 2) errors.contactName = 'Escribe quién atiende.';
  const pe = phoneError(stop.contactPhone);
  if (pe) errors.contactPhone = pe;
  return errors;
}

function StopSection({ target, touched }: { target: Target; touched: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const stop = useRequestDraft((s) => s[target]);
  const setStop = useRequestDraft((s) => s.setStop);
  const user = useAuth((s) => s.user);
  const errors = touched ? stopErrors(stop) : {};
  const color = target === 'pickup' ? colors.pickup : colors.delivery;

  return (
    <Card>
      <Overline style={{ color }}>{target === 'pickup' ? 'Recogida' : 'Entrega'}</Overline>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={target === 'pickup' ? 'Elegir dirección de recogida' : 'Elegir dirección de entrega'}
        onPress={() => router.push({ pathname: '/request/location', params: { target } })}
        style={({ pressed }) => [styles.place, errors.location ? { borderColor: colors.danger } : null, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="location" size={22} color={color} />
        <View style={{ flex: 1 }}>
          {stop.location ? (
            <>
              <Text style={styles.placeMain} numberOfLines={1}>
                {stop.location.addressLine}
              </Text>
              <Text style={styles.placeSub} numberOfLines={1}>
                {stop.location.city}, {stop.location.province}
              </Text>
            </>
          ) : (
            <Text style={[styles.placeMain, { color: colors.primaryText }]}>
              {target === 'pickup' ? '¿Dónde recogemos?' : '¿Dónde entregamos?'}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      </Pressable>
      {errors.location ? <Text style={styles.error}>{errors.location}</Text> : null}

      <ChoiceChips
        label="¿Quién atiende?"
        value={stop.contactMode}
        choices={[
          { key: 'SELF', label: 'Yo', icon: 'person-outline' },
          { key: 'OTHER', label: 'Otra persona', icon: 'people-outline' },
        ]}
        // «Yo» copia los datos de la cuenta; «Otra persona» los vacia.
        onChange={(mode) =>
          setStop(target, {
            contactMode: mode,
            contactName: mode === 'SELF' ? (user?.fullName ?? '') : '',
            contactPhone: mode === 'SELF' ? (user?.phone ?? '') : '',
          })
        }
      />
      {stop.contactMode === 'OTHER' || errors.contactName || errors.contactPhone ? (
        <>
          <TextField
            label="Nombre de contacto"
            icon="person-outline"
            value={stop.contactName}
            onChangeText={(contactName) => setStop(target, { contactName })}
            error={errors.contactName}
            maxLength={120}
          />
          <TextField
            label="Teléfono de contacto"
            icon="call-outline"
            keyboardType="phone-pad"
            value={stop.contactPhone}
            onChangeText={(contactPhone) => setStop(target, { contactPhone })}
            error={errors.contactPhone}
          />
        </>
      ) : (
        <Muted>
          {stop.contactName || 'Tú'} · {stop.contactPhone || 'agrega tu teléfono en Perfil'}
        </Muted>
      )}
      <TextField
        label="Indicaciones (opcional)"
        icon="chatbubble-ellipses-outline"
        placeholder={target === 'pickup' ? 'Ej. Tocar en el portón azul' : 'Ej. Dejar en recepción'}
        value={stop.instructions}
        onChangeText={(instructions) => setStop(target, { instructions })}
        maxLength={240}
        multiline
      />
    </Card>
  );
}

function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.switchLabel}>{label}</Text>
        {hint ? <Muted>{hint}</Muted> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
        thumbColor={colors.white}
      />
    </View>
  );
}

export default function RequestScreen() {
  const user = useAuth((s) => s.user);
  const draft = useRequestDraft();
  const { pickup, dropoff, item, serviceType, scheduleAt } = draft;
  const [touched, setTouched] = useState(false);
  // Hora de referencia de la validacion (no se lee el reloj en cada render).
  const [now] = useState(Date.now);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Con «Yo» (por defecto) las paradas heredan los datos de la cuenta.
  useEffect(() => {
    if (!user) return;
    for (const target of ['pickup', 'dropoff'] as const) {
      const stop = useRequestDraft.getState()[target];
      if (stop.contactMode === 'SELF' && !stop.contactName) {
        useRequestDraft.getState().setStop(target, { contactName: user.fullName, contactPhone: user.phone });
      }
    }
  }, [user]);

  const quantity = numberFromInput(item.quantity);
  const weight = numberFromInput(item.weightKg);
  const volume = numberFromInput(item.volumeM3);
  const declared = numberFromInput(item.declaredValue);
  const itemErrors: Partial<Record<'description' | 'quantity' | 'weightKg' | 'volumeM3' | 'declaredValue', string>> = {};
  if (item.description.trim().length < 2) itemErrors.description = 'Describe qué envías.';
  if (!Number.isInteger(quantity) || quantity < 1) itemErrors.quantity = 'Mínimo 1.';
  if (!(weight > 0)) itemErrors.weightKg = 'Indica el peso aproximado.';
  if (item.volumeM3.trim() && !(volume >= 0)) itemErrors.volumeM3 = 'Debe ser cero o mayor.';
  if (item.declaredValue.trim() && !(declared >= 0)) itemErrors.declaredValue = 'Debe ser cero o mayor.';
  const scheduleError =
    serviceType === 'SCHEDULED' && (!scheduleAt || scheduleAt.getTime() < now + 30 * 60_000)
      ? 'Elige una hora con al menos 30 minutos de antelación.'
      : null;
  const samePlace =
    pickup.location &&
    dropoff.location &&
    Math.abs(pickup.location.latitude - dropoff.location.latitude) < 1e-5 &&
    Math.abs(pickup.location.longitude - dropoff.location.longitude) < 1e-5;

  const valid =
    Object.keys(stopErrors(pickup)).length === 0 &&
    Object.keys(stopErrors(dropoff)).length === 0 &&
    Object.keys(itemErrors).length === 0 &&
    !scheduleError &&
    !samePlace;
  const shownItem = touched ? itemErrors : {};

  const next = async () => {
    setTouched(true);
    setError(null);
    if (!valid || !pickup.location || !dropoff.location) {
      if (samePlace) setError('La recogida y la entrega no pueden ser el mismo punto.');
      return;
    }
    // Normaliza los telefonos al formato de la API antes de seguir.
    draft.setStop('pickup', { contactPhone: cleanPhone(pickup.contactPhone) });
    draft.setStop('dropoff', { contactPhone: cleanPhone(dropoff.contactPhone) });
    setEstimating(true);
    try {
      const route = await mapsApi.estimateRoute({
        originAddress: fullAddress(pickup.location).slice(0, 180),
        originLatitude: pickup.location.latitude,
        originLongitude: pickup.location.longitude,
        destinationAddress: fullAddress(dropoff.location).slice(0, 180),
        destinationLatitude: dropoff.location.latitude,
        destinationLongitude: dropoff.location.longitude,
      });
      draft.set({ route });
      router.push('/request/vehicle');
    } catch (e) {
      setError(friendlyError(e, 'No pudimos calcular la ruta. Intenta de nuevo.'));
    } finally {
      setEstimating(false);
    }
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <>
          {draft.route ? (
            <Muted style={{ textAlign: 'center' }}>
              Ruta: {formatKm(draft.route.distanceKm)} · {formatMinutes(draft.route.estimatedDurationMin)}
            </Muted>
          ) : null}
          <Button label="Ver vehículos y precios" icon="arrow-forward" loading={estimating} onPress={() => void next()} />
        </>
      }
    >
      <StopSection target="pickup" touched={touched} />
      <StopSection target="dropoff" touched={touched} />

      <Card>
        <Overline>Carga</Overline>
        <TextField
          label="¿Qué envías?"
          icon="cube-outline"
          placeholder="Ej. 3 cajas de mercancía"
          value={item.description}
          onChangeText={(description) => draft.setItem({ description })}
          error={shownItem.description}
          maxLength={180}
        />
        <View style={rowStyle}>
          <TextField
            label="Cantidad"
            keyboardType="number-pad"
            value={item.quantity}
            onChangeText={(quantity) => draft.setItem({ quantity: quantity.replace(/\D/g, '') })}
            error={shownItem.quantity}
            style={{ flex: 1 }}
          />
          <TextField
            label="Peso por unidad (kg)"
            keyboardType="decimal-pad"
            value={item.weightKg}
            onChangeText={(weightKg) => draft.setItem({ weightKg })}
            error={shownItem.weightKg}
            style={{ flex: 1.4 }}
          />
        </View>
        <View style={rowStyle}>
          <TextField
            label="Volumen c/u (m³)"
            keyboardType="decimal-pad"
            placeholder="Opcional"
            value={item.volumeM3}
            onChangeText={(volumeM3) => draft.setItem({ volumeM3 })}
            error={shownItem.volumeM3}
            style={{ flex: 1 }}
          />
          <TextField
            label="Valor declarado (RD$)"
            keyboardType="decimal-pad"
            placeholder="Opcional"
            value={item.declaredValue}
            onChangeText={(declaredValue) => draft.setItem({ declaredValue })}
            error={shownItem.declaredValue}
            style={{ flex: 1 }}
          />
        </View>
        <SwitchRow label="Frágil" value={item.fragile} onChange={(fragile) => draft.setItem({ fragile })} />
        <SwitchRow
          label="Necesito ayudante"
          hint="Alguien que ayude a cargar y descargar."
          value={item.requireHelper}
          onChange={(requireHelper) => draft.setItem({ requireHelper })}
        />
      </Card>

      <Card>
        <Overline>¿Cuándo?</Overline>
        <ChoiceChips<ServiceType>
          value={serviceType}
          choices={[
            { key: 'INMEDIATE', label: 'Ahora', icon: 'flash-outline' },
            { key: 'SCHEDULED', label: 'Programar', icon: 'calendar-outline' },
          ]}
          onChange={(type) => draft.set({ serviceType: type, scheduleAt: type === 'SCHEDULED' ? (scheduleAt ?? minScheduleDate()) : null })}
        />
        {serviceType === 'SCHEDULED' ? (
          <ScheduleField value={scheduleAt} onChange={(date) => draft.set({ scheduleAt: date })} error={touched ? scheduleError : null} />
        ) : null}
        <TextField
          label="Notas para operaciones (opcional)"
          value={draft.notes}
          onChangeText={(notes) => draft.set({ notes })}
          maxLength={400}
          multiline
        />
      </Card>

      {error ? <ErrorBanner message={error} /> : null}
    </Screen>
  );
}

const rowStyle = { flexDirection: 'row', gap: spacing.md } as const;

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    place: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    placeMain: { fontSize: 15, fontWeight: '600', color: colors.text },
    placeSub: { fontSize: 13, color: colors.textMuted },
    error: { fontSize: 12, color: colors.dangerText, fontWeight: '600' },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  }),
);
