import { request } from './client';
import type {
  AddressValidationResult,
  ComputedRoute,
  GeocodeResult,
  LatLng,
  OrderApproachRoute,
  PlaceAutocompleteResult,
  PlaceDetailsResult,
  RouteEstimate,
} from '@/types/api';

export interface EstimateRouteInput {
  originAddress: string;
  originLatitude: number;
  originLongitude: number;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
}

export interface ComputeRouteInput {
  origin: LatLng;
  destination: LatLng;
  intermediates?: LatLng[];
}

export interface PlaceAutocompleteInput {
  input: string;
  sessionToken?: string;
  locationBias?: LatLng;
  radiusMeters?: number;
  includedPrimaryTypes?: string[];
}

export interface AddressValidationInput {
  addressLines: string[];
  regionCode?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
}

export interface RouteOptimizationInput {
  shipments: Record<string, unknown>[];
  vehicles: Record<string, unknown>[];
  globalStartTime?: string;
  globalEndTime?: string;
}

export const mapsApi = {
  estimateRoute(input: EstimateRouteInput) {
    return request<RouteEstimate>({ method: 'POST', url: '/routes/estimate', data: input });
  },

  computeRoute(input: ComputeRouteInput) {
    return request<ComputedRoute>({ method: 'POST', url: '/routes/compute', data: input });
  },

  getOrderRoute(orderId: string) {
    return request<ComputedRoute>({ method: 'GET', url: `/routes/orders/${orderId}` });
  },

  /** Tramo del conductor hacia la parada que le toca, si ya va en camino. */
  getOrderApproach(orderId: string) {
    return request<OrderApproachRoute>({ method: 'GET', url: `/routes/orders/${orderId}/approach` });
  },

  /** `signal` aborta la peticion cuando el usuario sigue tecleando. */
  autocompletePlaces(input: PlaceAutocompleteInput, signal?: AbortSignal) {
    return request<PlaceAutocompleteResult>({ method: 'POST', url: '/maps/places/autocomplete', data: input, signal });
  },

  getPlaceDetails(placeId: string, sessionToken?: string) {
    return request<PlaceDetailsResult>({ method: 'POST', url: '/maps/places/details', data: { placeId, sessionToken } });
  },

  /** `signal` cancela la peticion cuando el usuario sigue escribiendo. */
  geocode(address: string, signal?: AbortSignal) {
    return request<GeocodeResult[]>({ method: 'POST', url: '/maps/geocode', data: { address }, signal });
  },

  reverseGeocode(location: LatLng) {
    return request<GeocodeResult[]>({ method: 'POST', url: '/maps/reverse-geocode', data: location });
  },

  validateAddress(input: AddressValidationInput) {
    return request<AddressValidationResult>({ method: 'POST', url: '/maps/address-validation', data: input });
  },

  snapToRoads(points: LatLng[], interpolate = true) {
    return request<{
      snappedPoints: { location: LatLng; originalIndex: number | null; placeId: string | null }[];
      provider: 'google-roads' | 'internal-mock';
    }>({ method: 'POST', url: '/maps/roads/snap', data: { points, interpolate } });
  },

  optimizeRoutes(input: RouteOptimizationInput) {
    return request<{
      routes: unknown[];
      metrics: Record<string, unknown> | null;
      skippedShipments: unknown[];
      provider: 'google-route-optimization' | 'internal-mock';
    }>({ method: 'POST', url: '/maps/route-optimization', data: input });
  },
};
