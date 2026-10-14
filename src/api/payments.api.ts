import { request } from './client';
import type {
  CreateCardnetSessionResult,
  CreatePaymentResult,
  Payment,
  PaymentMethod,
  PaymentProvider,
  PaymentReceipt,
} from '@/types/api';

export interface CreatePaymentInput {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount?: number;
  currency?: string;
  provider?: PaymentProvider;
  returnUrl?: string;
  cancelUrl?: string;
}

export const paymentsApi = {
  create(input: CreatePaymentInput) {
    return request<CreatePaymentResult>({ method: 'POST', url: '/payments', data: input });
  },

  createCardnetCheckout(orderId: string, returnUrl: string, cancelUrl: string) {
    return paymentsApi.create({
      orderId,
      paymentMethod: 'CARD',
      provider: 'cardnet',
      returnUrl,
      cancelUrl,
    });
  },

  createCardnetSession(orderId: string) {
    return request<CreateCardnetSessionResult>({
      method: 'POST',
      url: '/payments/cardnet/sessions',
      data: { orderId },
    });
  },

  createCorporateCreditPayment(orderId: string) {
    return request<CreatePaymentResult>({
      method: 'POST',
      url: '/payments/corporate-credit',
      data: { orderId, notes: 'Usado por cliente desde la app movil' },
    });
  },

  verify(id: string) {
    return request<PaymentReceipt>({ method: 'POST', url: `/payments/${id}/verify` });
  },

  receipt(id: string) {
    return request<PaymentReceipt>({ method: 'GET', url: `/payments/${id}/receipt` });
  },

  get(id: string) {
    return request<Payment | null>({ method: 'GET', url: `/payments/${id}` });
  },
};
