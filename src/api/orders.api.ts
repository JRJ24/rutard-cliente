import { request } from './client';
import type {
  CancellationFee,
  OrderCancellationType,
  OrderEvent,
  OrderItemInput,
  OrderStatus,
  OrderStopInput,
  ServiceType,
  TransportOrder,
} from '@/types/api';

export interface OrderQueryInput {
  status?: OrderStatus;
  serviceType?: ServiceType;
  search?: string;
  customerId?: string;
  driverId?: string;
  vehicleCategoryId?: string;
  from?: string;
  to?: string;
}

export interface CreateOrderInput {
  quoteId: string;
  serviceType: ServiceType;
  scheduleAt?: string;
  notes?: string;
  stops: OrderStopInput[];
  items: OrderItemInput[];
}

export interface CancelOrderInput {
  cancellationType: OrderCancellationType;
  reason: string;
}

export const ordersApi = {
  list(query: OrderQueryInput = {}) {
    return request<TransportOrder[]>({ method: 'GET', url: '/orders', params: query });
  },

  listActive() {
    return request<TransportOrder[]>({
      method: 'GET',
      url: '/orders',
      params: { status: 'IN_PROGRESS' satisfies OrderStatus },
    });
  },

  listScheduled() {
    return request<TransportOrder[]>({
      method: 'GET',
      url: '/orders',
      params: { serviceType: 'SCHEDULED' satisfies ServiceType },
    });
  },

  listHistory() {
    return Promise.all([
      ordersApi.list({ status: 'DELIVERED' }),
      ordersApi.list({ status: 'CANCELLED' }),
      ordersApi.list({ status: 'FAILED' }),
    ]).then(([delivered, cancelled, failed]) => [...delivered, ...cancelled, ...failed]);
  },

  get(id: string) {
    return request<TransportOrder | null>({ method: 'GET', url: `/orders/${id}` });
  },

  create(input: CreateOrderInput) {
    return request<TransportOrder>({ method: 'POST', url: '/orders', data: input });
  },

  confirmByCustomer(id: string) {
    return request<TransportOrder>({ method: 'POST', url: `/orders/${id}/customer-confirm` });
  },

  cancel(id: string, input: CancelOrderInput) {
    return request<TransportOrder>({ method: 'POST', url: `/orders/${id}/cancel`, data: input });
  },

  listEvents(id: string) {
    return request<OrderEvent[]>({ method: 'GET', url: `/orders/${id}/events` });
  },

  /** Lo que costaria cancelar ahora (la API no aplica cargo hoy, pero informa). */
  cancellationFee(id: string) {
    return request<CancellationFee>({ method: 'GET', url: `/cancellation-fees/orders/${id}` });
  },
};
