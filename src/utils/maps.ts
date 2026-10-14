import type { Region } from 'react-native-maps';
import type { LatLng } from '@/types/api';

/** Centro por defecto: Santo Domingo, Distrito Nacional. */
export const DEFAULT_CENTER: LatLng = { latitude: 18.4861, longitude: -69.9312 };

export const DEFAULT_REGION: Region = {
  ...DEFAULT_CENTER,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

/** Zoom del selector de direccion (delta de ~1 km). */
export const FOCUS_DELTA = 0.008;

/** Recuadro de Republica Dominicana. */
export const DOMINICAN_REPUBLIC_BOUNDS = { north: 19.98, south: 17.36, east: -68.19, west: -72.05 };

export function isInsideDominicanRepublic(point: LatLng): boolean {
  const b = DOMINICAN_REPUBLIC_BOUNDS;
  return point.latitude <= b.north && point.latitude >= b.south && point.longitude <= b.east && point.longitude >= b.west;
}

/** Descarta 0/0, NaN y fuera de rango (la API devuelve 0 o null cuando falta el dato). */
export function isUsableLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
  );
}

/** Normaliza cualquier punto de la API (Decimal como string) a `LatLng`. */
export function toLatLng(point?: { latitude?: unknown; longitude?: unknown } | null): LatLng | null {
  if (!point || point.latitude == null || point.longitude == null) return null;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  return isUsableLatLng(latitude, longitude) ? { latitude, longitude } : null;
}

export function regionFor(point: LatLng, delta = FOCUS_DELTA): Region {
  return { ...point, latitudeDelta: delta, longitudeDelta: delta };
}

/**
 * Parte a nivel de calle de una direccion formateada por Google: provincia y
 * municipio viven en sus propios campos.
 */
export function streetOf(formattedAddress: string): string {
  const [street] = formattedAddress.split(',');
  return (street ?? formattedAddress).trim();
}

/** Compara nombres de provincia/municipio ignorando acentos y mayusculas. */
export function foldName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** Prefiere la coincidencia mas larga: "Santo Domingo Este" antes que "Santo Domingo". */
export function matchCatalogName<T extends { name: string }>(formattedAddress: string, options: T[]): T | undefined {
  const haystack = foldName(formattedAddress);
  return [...options]
    .filter((option) => haystack.includes(foldName(option.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

const CATALOG_PREFIXES = ['provincia de ', 'provincia ', 'municipio de ', 'municipio '];

/**
 * Entrada de catalogo a partir del componente estructurado que devuelve la API,
 * con la direccion formateada como respaldo (portado de app-customers).
 */
export function pickCatalogName<T extends { name: string }>(
  candidate: string | null | undefined,
  formattedAddress: string,
  options: T[],
): T | undefined {
  if (candidate) {
    let needle = foldName(candidate);
    for (const prefix of CATALOG_PREFIXES) {
      if (needle.startsWith(prefix)) {
        needle = needle.slice(prefix.length).trim();
        break;
      }
    }
    const exact = options.find((option) => foldName(option.name) === needle);
    if (exact) return exact;
  }
  return matchCatalogName(formattedAddress, options);
}

/** Codigos con los que la API marca un fallo del proveedor de mapas, no del usuario. */
const PROVIDER_CODES = new Set([
  'MAPS_PROVIDER_DENIED',
  'MAPS_PROVIDER_UNAVAILABLE',
  'MAPS_PROVIDER_QUOTA_EXCEEDED',
  'ROUTE_PROVIDER_UNAVAILABLE',
  'UPSTREAM_TIMEOUT',
  'UPSTREAM_ERROR',
  'SERVICE_UNAVAILABLE',
]);

export function isMapsProviderCode(code?: string): boolean {
  return code !== undefined && PROVIDER_CODES.has(code);
}

/** Una peticion cancelada porque el usuario sigue escribiendo no es un error. */
export function isAborted(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ((error as { code?: string }).code === 'ERR_CANCELED' || (error as { name?: string }).name === 'CanceledError')
  );
}
