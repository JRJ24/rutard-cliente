import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router, type Href } from 'expo-router';
import { queryClient } from '@/api/query';
import { secureStorage } from '@/services/storage/secure-storage';
import { socketService } from '@/services/socket/socket.service';
import { pushNotifications } from '@/services/notifications/push-notifications.service';
import { useAuth } from '@/store/auth.store';
import { useNotifications } from '@/store/notifications.store';
import { toast } from '@/store/toast.store';
import { orderStatusLabels } from '@/constants/status.constants';
import type { AppNotification, NotificationRoute, OrderStatusChangedEvent } from '@/types/api';

/** Pantalla de un push ya validado por `parseNotificationRoute`. */
export function hrefForRoute(route: NotificationRoute): Href | null {
  switch (route.screen) {
    case 'order-detail':
      return route.orderId ? { pathname: '/orders/[id]', params: { id: route.orderId } } : '/orders';
    case 'orders':
      return '/orders';
    case 'payments':
      return '/payments';
    case 'reservations':
      return '/reservations';
    case 'profile':
      return '/profile';
    case 'notifications':
      return '/notifications';
    default:
      return route.orderId ? { pathname: '/orders/[id]', params: { id: route.orderId } } : null;
  }
}

function refreshOrders() {
  void queryClient.invalidateQueries({ queryKey: ['orders'] });
}

/**
 * Lo que vive mientras hay sesion: socket, listeners de push y recarga al
 * volver a primer plano. Al cerrar sesion se limpian socket y caches.
 */
export function useAppLifecycle() {
  const status = useAuth((s) => s.status);
  const signedIn = status === 'authenticated';
  const pendingRoute = useRef<NotificationRoute | null>(null);

  // Listeners de push (una vez): tocar una notificacion abre su pantalla.
  useEffect(() => {
    const unsubscribe = pushNotifications.addListeners(
      (route) => {
        if (useAuth.getState().status !== 'authenticated') {
          pendingRoute.current = route;
          return;
        }
        const href = hrefForRoute(route);
        if (href) router.push(href);
      },
      () => {
        void useNotifications.getState().load();
        refreshOrders();
      },
    );
    void pushNotifications.getInitialRoute().then((route) => {
      if (route) pendingRoute.current = route;
    });
    return unsubscribe;
  }, []);

  // Push que abrio la app en frio: se aplica cuando ya hay sesion y navegador.
  useEffect(() => {
    if (!signedIn || !pendingRoute.current) return;
    const route = pendingRoute.current;
    pendingRoute.current = null;
    const href = hrefForRoute(route);
    if (href) setTimeout(() => router.push(href), 0);
  }, [signedIn]);

  // Socket mientras hay sesion.
  useEffect(() => {
    if (!signedIn) {
      socketService.disconnect();
      return undefined;
    }
    let cancelled = false;
    void secureStorage.getAccessToken().then((token) => {
      if (!cancelled && token) socketService.connect(token);
    });
    const offStatus = socketService.on<OrderStatusChangedEvent>('order.status.changed', (event) => {
      refreshOrders();
      const label = orderStatusLabels[event.status];
      if (label && (event.status === 'ACCEPTED' || event.status === 'IN_PROGRESS' || event.status === 'DELIVERED')) {
        toast.info('Tu envío cambió de estado', label);
      }
    });
    const offNotification = socketService.on<AppNotification>('notification.created', (item) => {
      useNotifications.getState().prepend(item);
      refreshOrders();
    });
    // Al reconectar puede haberse perdido un evento: se recarga.
    const offConnect = socketService.on('connect', refreshOrders);
    void useNotifications.getState().load();
    return () => {
      cancelled = true;
      offStatus();
      offNotification();
      offConnect();
    };
  }, [signedIn]);

  // Al volver a primer plano: el socket pudo estar suspendido.
  useEffect(() => {
    if (!signedIn) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshOrders();
        void useNotifications.getState().load();
      }
    });
    return () => sub.remove();
  }, [signedIn]);

  // Sesion cerrada: nada del usuario anterior queda en cache.
  useEffect(() => {
    if (status === 'unauthenticated') {
      queryClient.clear();
      useNotifications.setState({ items: [], unreadCount: 0 });
    }
  }, [status]);
}
