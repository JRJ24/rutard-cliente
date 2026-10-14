import { request } from './client';
import type {
  CreditMovement,
  CustomerAddress,
  CustomerCreditAccount,
  CustomerProfile,
  CustomerType,
  DocumentType,
  PagedResult,
} from '@/types/api';

export interface UpsertCustomerProfileInput {
  customerType: CustomerType;
  documentType: DocumentType;
  documentNumber: string;
  companyName?: string;
  billingEmail?: string;
}

export interface UpsertCustomerAddressInput {
  label: string;
  addressLine: string;
  city: string;
  province: string;
  countryCode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface RequestCustomerCreditInput {
  requestedLimit: number;
  creditDays?: number;
  notes?: string;
}

export const customersApi = {
  me() {
    return request<CustomerProfile>({ method: 'GET', url: '/customers/me' });
  },

  createMe(input: UpsertCustomerProfileInput) {
    return request<CustomerProfile>({ method: 'POST', url: '/customers/me', data: input });
  },

  updateMe(input: Partial<UpsertCustomerProfileInput>) {
    return request<CustomerProfile>({ method: 'PATCH', url: '/customers/me', data: input });
  },

  requestCredit(input: RequestCustomerCreditInput) {
    return request<CustomerCreditAccount>({ method: 'POST', url: '/customers/me/credit-request', data: input });
  },

  creditMovements(page = 1, pageSize = 10) {
    return request<PagedResult<CreditMovement>>({
      method: 'GET',
      url: '/customers/me/credit/movements',
      params: { page, pageSize },
    });
  },

  listAddresses() {
    return request<CustomerAddress[]>({ method: 'GET', url: '/customers/me/addresses' });
  },

  createAddress(input: UpsertCustomerAddressInput) {
    return request<CustomerAddress>({ method: 'POST', url: '/customers/me/addresses', data: input });
  },

  updateAddress(id: string, input: Partial<UpsertCustomerAddressInput>) {
    return request<CustomerAddress>({ method: 'PATCH', url: `/customers/me/addresses/${id}`, data: input });
  },

  deleteAddress(id: string) {
    return request<void>({ method: 'DELETE', url: `/customers/me/addresses/${id}` });
  },
};
