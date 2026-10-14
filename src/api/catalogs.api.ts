import { request } from './client';

export interface Province {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Municipality {
  id: string;
  provinceId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const catalogsApi = {
  listProvinces() {
    return request<Province[]>({ method: 'GET', url: '/catalogs/provinces' });
  },

  listMunicipalities(provinceId: string) {
    return request<Municipality[]>({
      method: 'GET',
      url: `/catalogs/provinces/${provinceId}/municipalities`,
    });
  },
};
