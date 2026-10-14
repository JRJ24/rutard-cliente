import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { darkMapStyle, lightMapStyle } from '@/features/map/mapStyle';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/theme';
import type { ComputedRoute, DriverLocation, LatLng, OrderStop } from '@/types/api';
import { DEFAULT_REGION, toLatLng } from '@/utils/maps';
import { decodePolyline } from '@/utils/polyline';

function Pin({ color, icon }: { color: string; icon: 'cube' | 'flag' | 'car' }) {
  const styles = useStyles();
  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      <Ionicons name={icon} size={16} color="#FFFFFF" />
    </View>
  );
}

/**
 * Mapa del envio: ruta de la carga (solida), tramo del conductor hacia la
 * parada (punteado) y la posicion del conductor en vivo.
 */
export function TrackingMap({
  stops,
  route,
  approach,
  driver,
  height = 260,
}: {
  stops: OrderStop[];
  route?: ComputedRoute | null;
  approach?: ComputedRoute | null;
  driver?: DriverLocation | null;
  height?: number;
}) {
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const mapRef = useRef<MapView>(null);

  const pickup = toLatLng(stops.find((s) => s.stopType === 'PICKUP'));
  const dropoff = toLatLng([...stops].reverse().find((s) => s.stopType === 'DROPOFF'));
  const driverPoint = toLatLng(driver);
  const routePath = useMemo(() => (route?.polyline ? decodePolyline(route.polyline) : []), [route]);
  const approachPath = useMemo(() => (approach?.polyline ? decodePolyline(approach.polyline) : []), [approach]);

  // Reencuadra solo cuando cambia lo que se ve, no en cada render.
  const fitKey = [pickup, dropoff, driverPoint ? 'driver' : '', routePath.length, approachPath.length]
    .map((p) => (p && typeof p === 'object' ? `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}` : String(p)))
    .join('|');

  useEffect(() => {
    const points: LatLng[] = [pickup, dropoff, driverPoint].filter((p): p is LatLng => p !== null);
    if (points.length === 0) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points.length === 1 ? [points[0], points[0]] : points, {
        edgePadding: { top: 60, right: 50, bottom: 60, left: 50 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(timer);
    // `fitKey` resume los puntos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        initialRegion={pickup ? { ...pickup, latitudeDelta: 0.08, longitudeDelta: 0.08 } : DEFAULT_REGION}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {routePath.length > 1 ? (
          <>
            <Polyline coordinates={routePath} strokeColor={colors.white} strokeWidth={8} />
            <Polyline coordinates={routePath} strokeColor={colors.primary} strokeWidth={5} />
          </>
        ) : null}
        {approachPath.length > 1 ? (
          <Polyline coordinates={approachPath} strokeColor={colors.textDim} strokeWidth={4} lineDashPattern={[8, 8]} />
        ) : null}
        {pickup ? (
          <Marker coordinate={pickup} title="Recogida" tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
            <Pin color={colors.pickup} icon="cube" />
          </Marker>
        ) : null}
        {dropoff ? (
          <Marker coordinate={dropoff} title="Entrega" tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
            <Pin color={colors.delivery} icon="flag" />
          </Marker>
        ) : null}
        {driverPoint ? (
          <Marker coordinate={driverPoint} title="Conductor" tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
            <Pin color={colors.primary} icon="car" />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const useStyles = makeStyles(({ colors, elevation }) =>
  StyleSheet.create({
    wrap: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted, ...elevation.card },
    pin: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
  }),
);
