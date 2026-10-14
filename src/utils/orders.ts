import type { AssignmentStatus, OrderStop, StopType, TransportOrder } from '@/types/api';
import { toNumber } from './format';

/** Paradas de la orden ordenadas por secuencia. */
export function stopsForOrder(order: TransportOrder): OrderStop[] {
  return [...(order.orderStops ?? [])].sort((a, b) => a.sequence - b.sequence);
}

export function stopByType(order: TransportOrder, stopType: StopType): OrderStop | undefined {
  const stops = stopsForOrder(order);
  return stops.find((stop) => stop.stopType === stopType) ?? stops[stopType === 'PICKUP' ? 0 : stops.length - 1];
}

export interface OrderAssignmentView {
  assignmentStatus: AssignmentStatus;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  vehicleLabel?: string;
  vehicleColor?: string;
}

/**
 * Asignacion vigente de la orden, si la hay. Una rechazada queda en el
 * historial, asi que solo cuentan las vivas, y la aceptada manda sobre una
 * pendiente que haya quedado suelta por una reasignacion.
 */
export function activeAssignment(order: TransportOrder): OrderAssignmentView | null {
  const live = (order.orderAssignments ?? []).filter(
    (a) => a.assignmentStatus === 'ACCEPTED' || a.assignmentStatus === 'PENDING',
  );
  const current = live.find((a) => a.assignmentStatus === 'ACCEPTED') ?? live[0];
  if (!current) return null;
  const vehicle = current.vehicle;
  return {
    assignmentStatus: current.assignmentStatus,
    driverName: current.driver?.user?.fullName,
    driverPhone: current.driver?.user?.phone ?? undefined,
    vehiclePlate: vehicle?.plateNumber,
    vehicleLabel: vehicle ? `${vehicle.brand} ${vehicle.model}`.trim() : undefined,
    vehicleColor: vehicle?.color,
  };
}

export function isOrderPaid(order: TransportOrder): boolean {
  return order.paymentStatus === 'PAID' || order.paymentStatus === 'AUTHORIZED';
}

/** La orden espera un pago del cliente para salir a buscar conductor. */
export function needsPayment(order: TransportOrder): boolean {
  return order.status === 'PENDING_PAYMENT' && !isOrderPaid(order);
}

export function orderTotal(order: TransportOrder): number | null {
  return toNumber(order.totalAmount);
}

/** Lo mas reciente primero. */
export function byNewest(a: { createdAt: string }, b: { createdAt: string }): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/** Prioridad para el seguimiento: en camino > aceptada > asignada > resto. */
export function trackingPriority(order: TransportOrder): number {
  return ({ IN_PROGRESS: 0, ACCEPTED: 1, ASSIGNED: 2 } as Record<string, number>)[order.status] ?? 3;
}
