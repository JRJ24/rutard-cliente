import { QueryClient } from '@tanstack/react-query';
import { isNetworkError, readApiFailure } from '@/utils/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Un 4xx no se arregla reintentando; la red y los 5xx si.
      retry: (count, error) => {
        if (count >= 2) return false;
        if (isNetworkError(error)) return true;
        const status = readApiFailure(error).status;
        return status === undefined || status >= 500;
      },
    },
    mutations: { retry: false },
  },
});

/** Mismas claves que app-customers: invalidar `['orders']` refresca todo. */
export const queryKeys = {
  userMe: ['users', 'me'] as const,
  customerMe: ['customers', 'me'] as const,
  customerAddresses: ['customers', 'me', 'addresses'] as const,
  creditMovements: (page: number) => ['customers', 'me', 'credit', 'movements', page] as const,
  sessions: ['sessions', 'me'] as const,
  notificationPreferences: ['users', 'me', 'notification-preferences'] as const,
  provinces: ['catalogs', 'provinces'] as const,
  municipalities: (provinceId: string) => ['catalogs', 'provinces', provinceId, 'municipalities'] as const,
  vehicleCategories: ['vehicle-categories'] as const,
  orders: (params?: unknown) => ['orders', params ?? {}] as const,
  order: (id: string) => ['orders', 'detail', id] as const,
  orderEvents: (id: string) => ['orders', 'detail', id, 'events'] as const,
  cancellationFee: (id: string) => ['orders', 'detail', id, 'cancellation-fee'] as const,
  orderRoute: (id: string) => ['routes', 'orders', id] as const,
  orderApproach: (id: string) => ['routes', 'orders', id, 'approach'] as const,
  latestLocation: (id: string) => ['locations', 'orders', id, 'latest'] as const,
  eta: (id: string) => ['eta', 'orders', id] as const,
  incidents: (orderId: string) => ['incidents', orderId] as const,
  evidence: (orderId: string) => ['delivery-proofs', orderId, 'bundle'] as const,
  receipt: (paymentId: string) => ['payments', paymentId, 'receipt'] as const,
};
