import { request } from './client';
import type { Attachment } from '@/types/api';

export interface AttachmentQueryInput {
  entityType?: 'Order' | 'DeliveryProof';
  entityId?: string;
}

/** Solo lectura: la API no deja subir adjuntos al rol CUSTOMER. */
export const attachmentsApi = {
  list(query: AttachmentQueryInput = {}) {
    return request<Attachment[]>({ method: 'GET', url: '/attachments', params: query });
  },
};

/** Archivo local para un multipart de React Native (`uri`, `name`, `type`). */
export interface UploadableFile {
  uri: string;
  name: string;
  type: string;
}
