import type { Incident, IncidentComment, IncidentSeverity, IncidentType } from '@/types/api';
import { request } from './client';

export interface CreateIncidentInput {
  orderId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
}

/**
 * Incidencias de una orden.
 *
 * `GET /incidents` devuelve cada incidencia con sus comentarios, que es como
 * la torre de control responde al conductor. Antes la comunicacion era de un
 * solo sentido: se reportaba y nunca se veia la respuesta.
 */
export const incidentsApi = {
  listForOrder(orderId: string) {
    return request<Incident[]>({ method: 'GET', url: '/incidents', params: { orderId } });
  },

  create(input: CreateIncidentInput) {
    return request<Incident>({ method: 'POST', url: '/incidents', data: input });
  },

  comment(incidentId: string, comment: string) {
    return request<IncidentComment>({
      method: 'POST',
      url: `/incidents/${incidentId}/comments`,
      data: { comment },
    });
  },
};
