import { useEffect, useState } from 'react';
import { queryClient, queryKeys } from '@/api/query';
import { socketService } from '@/services/socket/socket.service';
import type { DriverLocation, MatchingStatusEvent, TransportOrder } from '@/types/api';
import { terminalStatuses } from '@/constants/status.constants';

/**
 * Se une a la sala de cada orden viva del cliente: el servidor publica ahi
 * `order.status.changed` y la ubicacion del conductor. Una entregada o
 * cancelada ya no va a cambiar. Los listeners globales (invalidar `['orders']`)
 * los pone `useRealtimeBridge` en el layout.
 */
export function useWatchOrders(orders: TransportOrder[] | undefined) {
  // Clave primitiva: depender del array redispararia el efecto en cada refetch.
  const watched = (orders ?? [])
    .filter((order) => !terminalStatuses.has(order.status))
    .map((order) => order.id)
    .sort()
    .join(',');

  useEffect(() => {
    if (!watched) return undefined;
    const leaves = watched.split(',').map((id) => socketService.joinOrder(id));
    return () => leaves.forEach((leave) => leave());
  }, [watched]);
}

/**
 * Datos en vivo de una orden: la posicion del conductor llega por socket y se
 * escribe en la cache de `latestLocation`, y el estado de la busqueda
 * automatica de conductor.
 */
export function useOrderLive(orderId: string | undefined, active: boolean) {
  const [matching, setMatching] = useState<MatchingStatusEvent | null>(null);

  useEffect(() => {
    if (!orderId || !active) return undefined;
    const leave = socketService.joinOrder(orderId);
    const offLocation = socketService.on<DriverLocation>('tracking:location.updated', (location) => {
      if (location.orderId !== orderId) return;
      queryClient.setQueryData(queryKeys.latestLocation(orderId), location);
    });
    const offMatching = socketService.on<MatchingStatusEvent>('matching.status', (event) => {
      if (event.orderId === orderId) setMatching(event);
    });
    return () => {
      offLocation();
      offMatching();
      leave();
    };
  }, [orderId, active]);

  // El estado de otra orden no aplica cuando se cambia de orden.
  return matching?.orderId === orderId ? matching : null;
}
