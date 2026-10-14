import { request } from './client';
import type { DriverLocation } from '@/types/api';

export interface OrderEta {
  orderId: string;
  estimatedDurationMin: number | null;
  elapsedMin: number | null;
  remainingMin: number | null;
  lastLocationAt: string | null;
}

export const trackingApi = {
  listLocations(orderId: string) {
    return request<DriverLocation[]>({ method: 'GET', url: `/locations/orders/${orderId}` });
  },

  latestLocation(orderId: string) {
    return request<DriverLocation | null>({ method: 'GET', url: `/locations/orders/${orderId}/latest` });
  },

  eta(orderId: string) {
    return request<OrderEta>({ method: 'GET', url: `/eta/orders/${orderId}` });
  },

  trips(orderId: string) {
    return request<unknown[]>({ method: 'GET', url: `/trips/orders/${orderId}` });
  },

  orderEvents(orderId: string) {
    return request<unknown[]>({ method: 'GET', url: `/order-events/orders/${orderId}` });
  },
};
