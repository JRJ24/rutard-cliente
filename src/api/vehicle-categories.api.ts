import { request } from './client';
import type { VehicleCategory } from '@/types/api';

export const vehicleCategoriesApi = {
  list(includeInactive = false) {
    return request<VehicleCategory[]>({
      method: 'GET',
      url: '/vehicle-categories',
      params: { includeInactive },
      skipAuthRefresh: true,
    });
  },

  get(id: string) {
    return request<VehicleCategory | null>({
      method: 'GET',
      url: `/vehicle-categories/${id}`,
      skipAuthRefresh: true,
    });
  },
};
