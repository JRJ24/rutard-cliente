import type {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
  StopType,
  ValidationStatus,
} from '@/types/api';
import type { Tone } from '@/components/ui';

/**
 * Etiquetas en espanol de los enums de la API, tal como las lee el cliente.
 * Portadas de app-customers para que la web y el movil digan lo mismo.
 *
 * Aceptar es que un conductor confirme la orden: hasta que eso pasa, el texto
 * dice que se esta buscando conductor.
 */
export const orderStatusLabels: Record<OrderStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_QUOTE: 'Pendiente de cotización',
  PENDING_CUSTOMER_CONFIRMATION: 'Pendiente de tu confirmación',
  PENDING_PAYMENT: 'Pendiente de pago',
  CONFIRMED: 'Buscando conductor',
  ASSIGNING_DRIVER: 'Ofreciendo a un conductor cercano',
  REQUESTED: 'Buscando conductor',
  ASSIGNED: 'Conductor asignado · por confirmar',
  ACCEPTED: 'Conductor confirmado',
  IN_PROGRESS: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelada',
  FAILED: 'Fallida',
};

export const activeStatuses = new Set<OrderStatus>([
  'PENDING_QUOTE',
  'PENDING_CUSTOMER_CONFIRMATION',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'ASSIGNING_DRIVER',
  'REQUESTED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
]);

export const terminalStatuses = new Set<OrderStatus>(['DELIVERED', 'CANCELLED', 'FAILED']);

/** Estados en los que se esta buscando conductor (mensajes de `matching.status`). */
export const searchingStatuses = new Set<OrderStatus>(['CONFIRMED', 'ASSIGNING_DRIVER', 'REQUESTED']);

/**
 * Estados en los que el cliente puede cancelar. La API no valida el estado al
 * cancelar, asi que la app no ofrece el boton una vez que el viaje arranco.
 */
export const cancellableStatuses = new Set<OrderStatus>([
  'DRAFT',
  'PENDING_QUOTE',
  'PENDING_CUSTOMER_CONFIRMATION',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'ASSIGNING_DRIVER',
  'REQUESTED',
  'ASSIGNED',
  'ACCEPTED',
]);

/** Estados con conductor en juego: se sigue su ubicacion en vivo. */
export const trackableStatuses = new Set<OrderStatus>(['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS']);

export function toneForStatus(status: OrderStatus): Tone {
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED' || status === 'FAILED') return 'danger';
  // `ASSIGNED` sigue sin confirmar por el conductor: no merece el mismo azul
  // que un viaje ya aceptado o en curso.
  if (status === 'IN_PROGRESS' || status === 'ACCEPTED') return 'primary';
  return 'warning';
}

export const serviceLabels: Record<ServiceType, string> = {
  INMEDIATE: 'Inmediata',
  SCHEDULED: 'Programada',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  AUTHORIZED: 'Autorizado',
  PAID: 'Pagado',
  REFUNDED: 'Reembolsado',
  FAILED: 'Fallido',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};

export function toneForPayment(status: PaymentStatus): Tone {
  if (status === 'PAID' || status === 'AUTHORIZED') return 'success';
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') return 'danger';
  if (status === 'REFUNDED') return 'neutral';
  return 'warning';
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CARD: 'Tarjeta (CardNET)',
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  WALLET: 'Billetera',
  CHECK: 'Cheque',
  CORPORATE_CREDIT: 'Crédito corporativo',
};

export const stopTypeLabels: Record<StopType, string> = {
  PICKUP: 'Recogida',
  DROPOFF: 'Entrega',
  INTERMEDIATE: 'Parada',
};

export const validationStatusLabels: Record<ValidationStatus, string> = {
  PENDING: 'Pendiente',
  VALIDATED: 'Validada',
  REJECTED: 'Rechazada',
};

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  OPEN: 'Abierta',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
};

export const incidentTypeLabels: Record<IncidentType, string> = {
  DELAY: 'Retraso',
  DAMAGE: 'Daño a la carga',
  CUSTOMER_ABSENT: 'Receptor ausente',
  WRONG_ADDRESS: 'Dirección incorrecta',
  VEHICLE_PROBLEM: 'Problema con el vehículo',
  OTHER: 'Otro',
};

/** La severidad la decide el tipo, como en app-customers. */
export function severityForIncident(type: IncidentType): IncidentSeverity {
  if (type === 'DAMAGE' || type === 'VEHICLE_PROBLEM') return 'HIGH';
  if (type === 'OTHER') return 'LOW';
  return 'MEDIUM';
}
