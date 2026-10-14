import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import { queryClient, queryKeys } from '@/api/query';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { Button, Card, ErrorBanner, Muted, TextField } from '@/components/ui';
import { useAddresses } from '@/hooks/queries';
import { useLocationPick, type PickedLocation } from '@/store/request.store';
import { toast } from '@/store/toast.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import { friendlyError } from '@/utils/errors';
import { toLatLng } from '@/utils/maps';

const LABELS = ['Casa', 'Oficina', 'Almacén', 'Tienda'] as const;

/** Crear (sin `id`) o editar una direccion guardada; la ubicacion sale del selector. */
export default function AddressFormScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const addresses = useAddresses();
  const existing = id ? addresses.data?.find((a) => a.id === id) : undefined;
  const take = useLocationPick((s) => s.take);

  const [label, setLabel] = useState(existing?.label ?? 'Casa');
  const [location, setLocation] = useState<PickedLocation | null>(() => {
    if (!existing) return null;
    const point = toLatLng(existing);
    return {
      addressLine: existing.addressLine,
      city: existing.city,
      province: existing.province,
      latitude: point?.latitude ?? 0,
      longitude: point?.longitude ?? 0,
    };
  });
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [touched, setTouched] = useState(false);

  // Al volver del selector se recoge lo elegido.
  useFocusEffect(
    useCallback(() => {
      const picked = take('address');
      if (picked) setLocation(picked);
    }, [take]),
  );

  const labelError = label.trim().length < 2 ? 'Ponle un nombre.' : null;

  const save = useMutation({
    mutationFn: () => {
      if (!location) throw new Error('Elige la ubicación en el mapa.');
      const point = toLatLng(location);
      const payload = {
        label: label.trim().slice(0, 80),
        addressLine: location.addressLine.slice(0, 180),
        city: location.city.slice(0, 80),
        province: location.province.slice(0, 80),
        countryCode: 'DO',
        ...(point ? { latitude: point.latitude, longitude: point.longitude } : {}),
        isDefault,
      };
      return id ? customersApi.updateAddress(id, payload) : customersApi.createAddress(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerAddresses });
      toast.success(id ? 'Dirección actualizada' : 'Dirección guardada');
      router.back();
    },
  });

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label="Guardar dirección"
          icon="checkmark"
          loading={save.isPending}
          onPress={() => {
            setTouched(true);
            if (!labelError && location) save.mutate();
          }}
        />
      }
    >
      <Card>
        <ChoiceChips
          label="Etiqueta"
          value={(LABELS as readonly string[]).includes(label) ? label : null}
          choices={LABELS.map((l) => ({ key: l, label: l }))}
          onChange={setLabel}
        />
        <TextField label="Nombre" value={label} onChangeText={setLabel} maxLength={80} error={touched ? labelError : null} />
      </Card>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/request/location',
            params: {
              target: 'address',
              ...(location && toLatLng(location) ? { lat: String(location.latitude), lng: String(location.longitude) } : {}),
            },
          })
        }
        style={[styles.place, touched && !location ? { borderColor: colors.danger } : null]}
      >
        <Ionicons name="location" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          {location ? (
            <>
              <Text style={styles.main}>{location.addressLine}</Text>
              <Muted>
                {location.city}, {location.province}
              </Muted>
            </>
          ) : (
            <Text style={[styles.main, { color: colors.primaryText }]}>Elegir en el mapa</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      </Pressable>
      <Card style={styles.switchRow}>
        <Text style={styles.main}>Usar como principal</Text>
        <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: colors.primary, false: colors.surfaceMuted }} thumbColor={colors.white} />
      </Card>
      {save.error ? <ErrorBanner message={friendlyError(save.error)} /> : null}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    place: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    main: { fontSize: 15, fontWeight: '600', color: colors.text },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  }),
);
