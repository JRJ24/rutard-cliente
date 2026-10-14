import { catalogsApi, type Province } from '@/api/catalogs.api';
import { queryClient, queryKeys } from '@/api/query';
import type { GeocodeAddressComponents, LatLng } from '@/types/api';
import { pickCatalogName, streetOf } from '@/utils/maps';
import type { PickedLocation } from '@/store/request.store';

/** Direccion a medio resolver: provincia o municipio pueden faltar. */
export interface ResolvedDraft {
  addressLine: string;
  city: string;
  province: string;
  provinceId?: string;
  latitude: number;
  longitude: number;
  formatted: string;
}

async function provinces(): Promise<Province[]> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.provinces,
    queryFn: catalogsApi.listProvinces,
    staleTime: 60 * 60_000,
  });
}

async function municipalities(provinceId: string) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.municipalities(provinceId),
    queryFn: () => catalogsApi.listMunicipalities(provinceId),
    staleTime: 60 * 60_000,
  });
}

/**
 * Convierte un resultado de Google (via API) en una parada: calle, municipio y
 * provincia con los nombres del catalogo. Si el catalogo no casa, se usa el
 * nombre de Google tal cual y el cliente puede corregirlo.
 */
export async function resolveAddress(
  point: LatLng,
  formattedAddress: string,
  components?: GeocodeAddressComponents,
): Promise<ResolvedDraft> {
  const list = await provinces().catch(() => [] as Province[]);
  const province = pickCatalogName(components?.province, formattedAddress, list);
  let city = '';
  if (province) {
    const towns = await municipalities(province.id).catch(() => []);
    const town = pickCatalogName(components?.municipality, formattedAddress, towns);
    city = town?.name ?? '';
  }
  return {
    addressLine: (components?.street || streetOf(formattedAddress)).slice(0, 180),
    city: (city || components?.municipality || components?.sector || '').slice(0, 80),
    province: (province?.name ?? components?.province ?? '').slice(0, 80),
    provinceId: province?.id,
    latitude: point.latitude,
    longitude: point.longitude,
    formatted: formattedAddress,
  };
}

export function isComplete(draft: Pick<PickedLocation, 'addressLine' | 'city' | 'province'>): boolean {
  return draft.addressLine.trim().length >= 5 && draft.city.trim().length > 0 && draft.province.trim().length > 0;
}

/** Texto de una sola linea para tarjetas y la cotizacion. */
export function fullAddress(location: Pick<PickedLocation, 'addressLine' | 'city' | 'province'>): string {
  return [location.addressLine, location.city, location.province, 'República Dominicana']
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}
