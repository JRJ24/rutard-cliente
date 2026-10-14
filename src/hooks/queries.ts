import { useQuery } from '@tanstack/react-query';
import { catalogsApi } from '@/api/catalogs.api';
import { customersApi } from '@/api/customers.api';
import { deliveryProofsApi } from '@/api/delivery-proofs.api';
import { incidentsApi } from '@/api/incidents.api';
import { mapsApi } from '@/api/maps.api';
import { ordersApi, type OrderQueryInput } from '@/api/orders.api';
import { paymentsApi } from '@/api/payments.api';
import { queryKeys } from '@/api/query';
import { trackingApi } from '@/api/tracking.api';
import { usersApi } from '@/api/users.api';
import { vehicleCategoriesApi } from '@/api/vehicle-categories.api';
import { accountApi } from '@/api/account.api';
import { useAuth } from '@/store/auth.store';

/** Las consultas privadas solo corren con sesion. */
function useSignedIn(): boolean {
  return useAuth((s) => s.status === 'authenticated');
}

export function useCustomerMe() {
  const signedIn = useSignedIn();
  return useQuery({ queryKey: queryKeys.customerMe, queryFn: customersApi.me, enabled: signedIn, retry: false });
}

export function useAddresses() {
  const signedIn = useSignedIn();
  return useQuery({ queryKey: queryKeys.customerAddresses, queryFn: customersApi.listAddresses, enabled: signedIn });
}

export function useProvinces() {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.provinces,
    queryFn: catalogsApi.listProvinces,
    enabled: signedIn,
    staleTime: 60 * 60_000,
  });
}

export function useMunicipalities(provinceId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.municipalities(provinceId ?? ''),
    queryFn: () => catalogsApi.listMunicipalities(provinceId ?? ''),
    enabled: signedIn && Boolean(provinceId),
    staleTime: 60 * 60_000,
  });
}

export function useVehicleCategories() {
  return useQuery({
    queryKey: queryKeys.vehicleCategories,
    queryFn: () => vehicleCategoriesApi.list(),
    staleTime: 10 * 60_000,
  });
}

/**
 * `refetchInterval` es la red de seguridad del socket: si la conexion cae o el
 * sistema la suspende en segundo plano, el cliente igual ve el cambio de estado.
 */
export function useOrders(query: OrderQueryInput = {}) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.orders(query),
    queryFn: () => ordersApi.list(query),
    enabled: signedIn,
    refetchInterval: 30_000,
  });
}

/** `GET /orders/:id` devuelve `data: null` (no 404) si la orden no existe. */
export function useOrder(id: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.order(id ?? ''),
    queryFn: () => ordersApi.get(id ?? ''),
    enabled: signedIn && Boolean(id),
    refetchInterval: 30_000,
  });
}

export function useOrderEvents(id: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.orderEvents(id ?? ''),
    queryFn: () => ordersApi.listEvents(id ?? ''),
    enabled: signedIn && Boolean(id),
  });
}

export function useOrderRoute(id: string | undefined, enabled = true) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.orderRoute(id ?? ''),
    queryFn: () => mapsApi.getOrderRoute(id ?? ''),
    enabled: signedIn && enabled && Boolean(id),
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/**
 * Tramo del conductor hacia la parada. 30 s es barato: el backend solo llama a
 * Google cuando el conductor se alejo mas de 200 m.
 */
export function useOrderApproach(id: string | undefined, enabled = true) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.orderApproach(id ?? ''),
    queryFn: () => mapsApi.getOrderApproach(id ?? ''),
    enabled: signedIn && enabled && Boolean(id),
    refetchInterval: 30_000,
    retry: false,
  });
}

/** El socket escribe aqui cada `tracking:location.updated`; el sondeo es respaldo. */
export function useLatestLocation(id: string | undefined, enabled = true) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.latestLocation(id ?? ''),
    queryFn: () => trackingApi.latestLocation(id ?? ''),
    enabled: signedIn && enabled && Boolean(id),
    refetchInterval: 20_000,
  });
}

export function useIncidents(orderId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.incidents(orderId ?? ''),
    queryFn: () => incidentsApi.listForOrder(orderId ?? ''),
    enabled: signedIn && Boolean(orderId),
    refetchInterval: 60_000,
  });
}

export function useEvidence(orderId: string | undefined, enabled = true) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.evidence(orderId ?? ''),
    queryFn: () => deliveryProofsApi.bundle(orderId ?? ''),
    enabled: signedIn && enabled && Boolean(orderId),
    staleTime: 5 * 60_000,
  });
}

export function useCancellationFee(orderId: string | undefined, enabled: boolean) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.cancellationFee(orderId ?? ''),
    queryFn: () => ordersApi.cancellationFee(orderId ?? ''),
    enabled: signedIn && enabled && Boolean(orderId),
    staleTime: 0,
  });
}

export function useReceipt(paymentId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.receipt(paymentId ?? ''),
    queryFn: () => paymentsApi.receipt(paymentId ?? ''),
    enabled: signedIn && Boolean(paymentId),
  });
}

export function useSessions() {
  const signedIn = useSignedIn();
  return useQuery({ queryKey: queryKeys.sessions, queryFn: accountApi.sessions, enabled: signedIn });
}

export function useNotificationPreferences() {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: usersApi.notificationPreferences,
    enabled: signedIn,
  });
}

export function useCreditMovements(page: number, enabled: boolean) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.creditMovements(page),
    queryFn: () => customersApi.creditMovements(page, 20),
    enabled: signedIn && enabled,
  });
}
