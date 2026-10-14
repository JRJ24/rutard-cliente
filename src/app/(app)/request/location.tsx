import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { mapsApi } from '@/api/maps.api';
import { CatalogPicker } from '@/components/CatalogPicker';
import { Button, ErrorBanner, IconButton, Muted, TextField } from '@/components/ui';
import { darkMapStyle, lightMapStyle } from '@/features/map/mapStyle';
import { isComplete, resolveAddress, type ResolvedDraft } from '@/features/request/resolveAddress';
import { useAddresses, useMunicipalities, useProvinces } from '@/hooks/queries';
import { useLocationPick, useRequestDraft, type LocationTarget } from '@/store/request.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import type { LatLng, PlaceSuggestion } from '@/types/api';
import { readApiFailure } from '@/utils/errors';
import { haptic } from '@/utils/feedback';
import { uuid } from '@/utils/id';
import { DEFAULT_CENTER, DEFAULT_REGION, isAborted, isInsideDominicanRepublic, isMapsProviderCode, regionFor, toLatLng } from '@/utils/maps';

const TITLES: Record<LocationTarget, string> = {
  pickup: '¿Dónde recogemos?',
  dropoff: '¿Dónde entregamos?',
  address: 'Ubicación de la dirección',
};

const PROVIDER_DOWN = 'El servicio de mapas no responde. Escribe la dirección a mano o intenta de nuevo.';
const NOT_FOUND = 'No encontramos una dirección en ese punto. Mueve el mapa o escríbela a mano.';

/**
 * Selector de direccion: buscar (autocompletado de la API), mover el mapa bajo
 * el pin central, usar el GPS o elegir una direccion guardada. Todo Google pasa
 * por la API; el mapa solo pinta.
 */
export default function LocationPickerScreen() {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ target?: string; lat?: string; lng?: string }>();
  const target: LocationTarget = params.target === 'dropoff' || params.target === 'address' ? params.target : 'pickup';

  const existing = useRequestDraft((s) => (target === 'address' ? null : s[target].location));
  const setStop = useRequestDraft((s) => s.setStop);
  const put = useLocationPick((s) => s.put);
  const addresses = useAddresses();
  const provinces = useProvinces();

  const initialPoint =
    toLatLng({ latitude: params.lat, longitude: params.lng }) ??
    (existing ? { latitude: existing.latitude, longitude: existing.longitude } : null);

  const mapRef = useRef<MapView>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const sessionToken = useRef(uuid());
  // Mover el mapa por codigo (busqueda, GPS) no debe disparar otro reverse.
  const skipNextRegion = useRef(false);

  const [draft, setDraft] = useState<ResolvedDraft | null>(
    existing ? { ...existing, formatted: existing.formatted ?? existing.addressLine } : null,
  );
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickProvince, setPickProvince] = useState(false);
  const [pickCity, setPickCity] = useState(false);

  const provinceId = useMemo(
    () => draft?.provinceId ?? provinces.data?.find((p) => p.name === draft?.province)?.id,
    [draft?.provinceId, draft?.province, provinces.data],
  );
  const municipalities = useMunicipalities(provinceId);

  // ── Autocompletado (debounce 300 ms, cancela la anterior) ─────────────────
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await mapsApi.autocompletePlaces(
          {
            input: text.slice(0, 180),
            sessionToken: sessionToken.current,
            locationBias: draft ? { latitude: draft.latitude, longitude: draft.longitude } : DEFAULT_CENTER,
            radiusMeters: 50000,
          },
          controller.signal,
        );
        setSuggestions(res.suggestions);
        setError(res.provider === 'internal-mock' ? PROVIDER_DOWN : null);
      } catch (e) {
        if (!isAborted(e)) setError(isMapsProviderCode(readApiFailure(e).code) ? PROVIDER_DOWN : null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `draft` solo sesga la busqueda: no debe relanzarla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const moveTo = (point: LatLng) => {
    skipNextRegion.current = true;
    mapRef.current?.animateToRegion(regionFor(point), 450);
  };

  const reverse = async (point: LatLng) => {
    setResolving(true);
    setError(null);
    try {
      const results = await mapsApi.reverseGeocode(point);
      const best = results[0];
      if (!best || best.provider === 'internal-mock') {
        setError(best ? PROVIDER_DOWN : NOT_FOUND);
        setDraft((d) => ({
          addressLine: d?.addressLine ?? '',
          city: d?.city ?? '',
          province: d?.province ?? '',
          provinceId: d?.provinceId,
          formatted: d?.formatted ?? '',
          ...point,
        }));
        return;
      }
      setDraft(await resolveAddress(point, best.formattedAddress, best.components));
    } catch (e) {
      setError(isMapsProviderCode(readApiFailure(e).code) || (readApiFailure(e).status ?? 0) >= 500 ? PROVIDER_DOWN : NOT_FOUND);
      setDraft((d) => (d ? { ...d, ...point } : { addressLine: '', city: '', province: '', formatted: '', ...point }));
    } finally {
      setResolving(false);
    }
  };

  const choosePlace = async (s: PlaceSuggestion) => {
    Keyboard.dismiss();
    setQuery('');
    setSuggestions([]);
    setResolving(true);
    try {
      const details = await mapsApi.getPlaceDetails(s.placeId, sessionToken.current);
      // El token de sesion de Places se cierra al pedir los detalles.
      sessionToken.current = uuid();
      if (!details.location) {
        setError(NOT_FOUND);
        return;
      }
      moveTo(details.location);
      setDraft(await resolveAddress(details.location, details.formattedAddress ?? s.text, details.components));
      setError(null);
    } catch {
      setError(PROVIDER_DOWN);
    } finally {
      setResolving(false);
    }
  };

  const locateMe = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Activa el permiso de ubicación para usar tu posición actual.');
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      moveTo(point);
      await reverse(point);
    } catch {
      setError('No pudimos obtener tu ubicación.');
    } finally {
      setLocating(false);
    }
  };

  // Sin punto previo se arranca en la ubicacion del cliente (si ya dio permiso).
  useEffect(() => {
    if (initialPoint) return;
    void (async () => {
      const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (perm?.status === 'granted') void locateMe();
    })();
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRegionChangeComplete = (region: Region, details?: { isGesture?: boolean }) => {
    if (skipNextRegion.current) {
      skipNextRegion.current = false;
      return;
    }
    // En Android `isGesture` no siempre llega: sin el se asume gesto.
    if (details?.isGesture === false) return;
    void reverse({ latitude: region.latitude, longitude: region.longitude });
  };

  const confirm = () => {
    if (!draft || !isComplete(draft)) return;
    if (!isInsideDominicanRepublic(draft)) {
      setError('Por ahora solo operamos dentro de República Dominicana.');
      return;
    }
    haptic.success();
    const location = {
      addressLine: draft.addressLine.trim(),
      city: draft.city.trim(),
      province: draft.province.trim(),
      latitude: draft.latitude,
      longitude: draft.longitude,
      formatted: draft.formatted,
    };
    put(target, location);
    if (target !== 'address') setStop(target, { location });
    router.back();
  };

  const visibleSuggestions = query.trim().length >= 3 ? suggestions : [];
  const showSaved = target !== 'address' && query.trim().length < 3 && (addresses.data?.length ?? 0) > 0 && !draft;

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        initialRegion={initialPoint ? regionFor(initialPoint) : DEFAULT_REGION}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapPadding={{ top: 140, bottom: 260, left: 0, right: 0 }}
      />

      {/* Pin fijo en el centro: el mapa se mueve debajo. */}
      <View pointerEvents="none" style={styles.pinWrap}>
        <Ionicons name="location-sharp" size={44} color={target === 'dropoff' ? colors.delivery : colors.pickup} />
      </View>

      <View style={[styles.top, { paddingTop: spacing.md }]}>
        <Text style={styles.title}>{TITLES[target]}</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textDim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar calle, negocio o sector"
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          {query ? (
            <Pressable hitSlop={8} onPress={() => setQuery('')} accessibilityLabel="Limpiar búsqueda">
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </Pressable>
          ) : null}
        </View>
        {visibleSuggestions.length > 0 ? (
          <FlatList
            style={styles.suggestions}
            data={visibleSuggestions}
            keyExtractor={(s) => s.placeId}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => void choosePlace(item)}
                style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionMain} numberOfLines={1}>
                    {item.mainText ?? item.text}
                  </Text>
                  {item.secondaryText ? (
                    <Text style={styles.suggestionSub} numberOfLines={1}>
                      {item.secondaryText}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        ) : showSaved ? (
          <View style={styles.suggestions}>
            {(addresses.data ?? []).slice(0, 5).map((a) => (
              <Pressable
                key={a.id}
                onPress={async () => {
                  const point = toLatLng(a);
                  if (point) moveTo(point);
                  const resolved: ResolvedDraft = {
                    addressLine: a.addressLine,
                    city: a.city,
                    province: a.province,
                    latitude: point?.latitude ?? DEFAULT_CENTER.latitude,
                    longitude: point?.longitude ?? DEFAULT_CENTER.longitude,
                    formatted: a.addressLine,
                  };
                  setDraft(resolved);
                  if (!point) setError('Esa dirección guardada no tiene ubicación: mueve el mapa hasta el punto exacto.');
                }}
                style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name={a.isDefault ? 'star' : 'bookmark-outline'} size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionMain}>{a.label}</Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {a.addressLine}, {a.city}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <IconButton
        icon="locate"
        accessibilityLabel="Usar mi ubicación"
        tone="primary"
        onPress={() => void locateMe()}
        style={styles.locate}
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        {resolving || locating ? (
          <View style={styles.resolving}>
            <ActivityIndicator color={colors.primary} />
            <Muted>{locating ? 'Buscando tu ubicación…' : 'Buscando la dirección…'}</Muted>
          </View>
        ) : null}
        {error ? <ErrorBanner message={error} /> : null}
        {draft ? (
          <>
            <TextField
              label="Calle y número"
              icon="home-outline"
              value={draft.addressLine}
              onChangeText={(addressLine) => setDraft({ ...draft, addressLine })}
              placeholder="Av. Winston Churchill #10"
              maxLength={180}
              error={draft.addressLine.trim().length > 0 && draft.addressLine.trim().length < 5 ? 'Muy corta.' : null}
            />
            <View style={styles.row}>
              <Pressable style={[styles.select, { flex: 1 }]} onPress={() => setPickProvince(true)}>
                <Text style={styles.selectLabel}>Provincia</Text>
                <Text style={[styles.selectValue, !draft.province && styles.selectEmpty]} numberOfLines={1}>
                  {draft.province || 'Elegir'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.select, { flex: 1 }]}
                onPress={() => provinceId && setPickCity(true)}
                disabled={!provinceId}
              >
                <Text style={styles.selectLabel}>Municipio</Text>
                <Text style={[styles.selectValue, !draft.city && styles.selectEmpty]} numberOfLines={1}>
                  {draft.city || 'Elegir'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Muted>Busca la dirección o mueve el mapa hasta el punto exacto.</Muted>
        )}
        <Button
          label="Confirmar dirección"
          icon="checkmark"
          disabled={!draft || !isComplete(draft) || resolving}
          onPress={confirm}
        />
      </View>

      <CatalogPicker
        visible={pickProvince}
        title="Provincia"
        options={provinces.data ?? []}
        selected={draft?.province}
        onClose={() => setPickProvince(false)}
        onSelect={(p) => draft && setDraft({ ...draft, province: p.name, provinceId: p.id, city: '' })}
      />
      <CatalogPicker
        visible={pickCity}
        title="Municipio"
        options={municipalities.data ?? []}
        selected={draft?.city}
        onClose={() => setPickCity(false)}
        onSelect={(m) => draft && setDraft({ ...draft, city: m.name })}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors, elevation }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    pinWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      // Centro del area visible (entre la busqueda y la hoja): la punta del pin
      // marca el punto.
      top: 0,
      bottom: 260 - 140,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 44,
    },
    top: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: 0, gap: spacing.sm },
    title: { fontSize: 18, fontWeight: '700', color: colors.text, textShadowColor: colors.surface, textShadowRadius: 6 },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      minHeight: 50,
      ...elevation.raised,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 },
    suggestions: { backgroundColor: colors.surface, borderRadius: radius.md, maxHeight: 300, ...elevation.raised },
    suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    suggestionMain: { fontSize: 15, fontWeight: '600', color: colors.text },
    suggestionSub: { fontSize: 13, color: colors.textMuted },
    locate: { position: 'absolute', right: spacing.lg, bottom: 300 },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      ...elevation.floating,
    },
    resolving: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.md },
    select: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 2,
    },
    selectLabel: { fontSize: 12, color: colors.textDim, fontWeight: '600' },
    selectValue: { fontSize: 15, color: colors.text, fontWeight: '600' },
    selectEmpty: { color: colors.primaryText },
  }),
);
