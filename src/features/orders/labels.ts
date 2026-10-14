import type { AssignmentStatus, MatchingStatusEvent, OrderEvent, OrderStatus } from '@/types/api';
import { formatMinutes } from '@/utils/format';

export function assignmentStatusLabel(status: AssignmentStatus): string {
  return status === 'ACCEPTED' ? 'Conductor confirmado' : status === 'PENDING' ? 'Por confirmar' : status;
}

/** Mensaje de la busqueda automatica de conductor (`matching.status`). */
export function matchingMessage(event: MatchingStatusEvent | null, status: OrderStatus): string {
  if (event?.state === 'OFFERING') {
    const eta = event.etaSeconds ? ` a ${formatMinutes(event.etaSeconds / 60)} de la recogida` : ' cercano';
    return `Ofreciendo tu envío a un conductor${eta}.`;
  }
  if (event?.state === 'NO_DRIVERS') {
    return 'No hay conductores libres ahora mismo: un operador te asignará uno.';
  }
  if (status === 'ASSIGNING_DRIVER') return 'Ofreciendo tu envío a un conductor cercano.';
  return 'Buscando el conductor más cercano…';
}

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Orden creada',
  ASSIGNED: 'Conductor asignado',
  ACCEPTED: 'Conductor confirmó',
  PICKED_UP: 'Carga recogida',
  IN_TRANSIT: 'En camino',
  ARRIVED: 'Conductor llegó',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelada',
  INCIDENT_REPORTED: 'Incidencia reportada',
};

export function eventLabel(event: OrderEvent): string {
  return EVENT_LABELS[event.eventType] ?? event.description ?? event.eventType;
}
