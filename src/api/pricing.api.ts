import { request } from './client';
import type { PriceQuote, QuoteOption } from '@/types/api';

export interface CreatePriceQuoteInput {
  vehicleCategoryId: string;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number;
  estimatedDurationMin: number;
  requireHelper?: boolean;
  nightService?: boolean;
  /** Para la tarifa por demanda de la zona de recogida. */
  originLatitude?: number;
  originLongitude?: number;
}

export interface QuoteOptionsInput {
  distanceKm: number;
  estimatedDurationMin: number;
  /** Por unidad, no total: el backend lo multiplica por `quantity`. */
  weightKg?: number;
  volumeM3?: number;
  quantity?: number;
  requireHelper?: boolean;
  nightService?: boolean;
  originLatitude?: number;
  originLongitude?: number;
}

export const pricingApi = {
  /**
   * Precio de cada categoria para la ruta y la carga actuales.
   *
   * No persiste nada, asi que se puede llamar en cada cambio del formulario.
   * `signal` la cancela cuando el usuario sigue editando.
   */
  quoteOptions(input: QuoteOptionsInput, signal?: AbortSignal) {
    return request<QuoteOption[]>({ method: 'POST', url: '/pricing/quote-options', data: input, signal });
  },

  /** Cotizacion que se cobra. Se llama una sola vez, al crear la orden. */
  createQuote(input: CreatePriceQuoteInput) {
    return request<PriceQuote>({ method: 'POST', url: '/pricing/quotes', data: input });
  },

  getQuote(id: string) {
    return request<PriceQuote | null>({ method: 'GET', url: `/pricing/quotes/${id}` });
  },
};
