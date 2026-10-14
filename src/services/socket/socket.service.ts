import { io, type Socket } from 'socket.io-client';
import { apiClient } from '@/api/client';
import { env } from '@/config/env';
import { secureStorage } from '@/services/storage/secure-storage';

type Handler = (payload: unknown) => void;

// Rechazos seguidos del middleware antes de rendirse: si el token recien
// refrescado tambien se rechaza, la sesion no se va a arreglar reintentando.
const MAX_AUTH_RETRIES = 5;

/**
 * Envoltorio de socket.io-client (portado del driver). El socket trae los
 * cambios en vivo (estado de la orden, ubicacion del conductor, notificaciones);
 * la verdad sigue siendo la API REST, que react-query vuelve a pedir.
 *
 * Los listeners viven aqui y no en el socket: una pantalla puede suscribirse
 * antes del login o entre reconexiones sin perder eventos.
 */
class SocketService {
  private socket: Socket | null = null;
  private token = '';
  /** Rooms order:{id} pedidas, con cuantas pantallas las usan. */
  private readonly joined = new Map<string, number>();
  private readonly listeners = new Map<string, Set<Handler>>();
  private authRetries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  connect(accessToken: string): void {
    this.token = accessToken;
    // Siempre la MISMA instancia mientras dure la sesion.
    if (this.socket) {
      if (!this.socket.active) {
        this.clearRetry();
        this.socket.connect();
      }
      return;
    }
    const socket = io(env.socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // Funcion y no objeto: se evalua en cada reconexion y manda el token
      // vigente. Con el objeto fijo, pasados 15 min el middleware lo rechaza.
      auth: (cb) => {
        void secureStorage
          .getAccessToken()
          .catch(() => null)
          .then((token) => cb({ token: token ?? this.token }));
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
    this.socket = socket;
    this.listeners.forEach((handlers, event) => handlers.forEach((h) => socket.on(event, h)));

    // 'connect' salta tambien en cada reconexion: el servidor ve un socket
    // nuevo y no recuerda las salas del anterior.
    socket.on('connect', () => {
      this.authRetries = 0;
      this.joined.forEach((_count, orderId) => socket.emit('tracking:join-order', { orderId }));
    });
    socket.on('connect_error', (error) => {
      console.warn('[socket] connect_error', error.message);
      // Con `active` el Manager ya reintenta solo (corte de red). Sin el, el
      // middleware rechazo el handshake y socket.io no vuelve a intentarlo.
      if (socket.active || this.socket !== socket) {
        return;
      }
      if (this.authRetries >= MAX_AUTH_RETRIES) {
        console.warn('[socket] handshake rechazado, sin mas reintentos');
        return;
      }
      const attempt = this.authRetries++;
      void apiClient
        .refreshAccessToken()
        .catch(() => null)
        .then((token) => {
          if (this.socket !== socket) {
            return;
          }
          // Sin token (sin red, 5xx o 429) se reintenta igual: rendirse dejaba
          // el socket muerto hasta el proximo login. Un refresh rechazado ya
          // cierra la sesion, y disconnect() cancela este reintento.
          if (token) {
            this.token = token;
          }
          this.clearRetry();
          const delay = (1000 + Math.random() * 2000) * 2 ** attempt;
          this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            if (this.socket === socket && !socket.active) {
              socket.connect();
            }
          }, delay);
        });
    });
    socket.on('tracking:error', (payload: unknown) => {
      console.warn('[socket] tracking:error', payload);
    });
  }

  /** Devuelve la funcion que abandona la sala (cuenta referencias). */
  joinOrder(orderId: string): () => void {
    const count = this.joined.get(orderId) ?? 0;
    this.joined.set(orderId, count + 1);
    // Desconectado no se emite: lo hace el handler de 'connect', y asi no
    // sale duplicado desde el buffer de socket.io.
    if (count === 0 && this.socket?.connected) {
      this.socket.emit('tracking:join-order', { orderId });
    }
    let left = false;
    return () => {
      if (left) return;
      left = true;
      this.leaveOrder(orderId);
    };
  }

  private leaveOrder(orderId: string): void {
    const count = this.joined.get(orderId) ?? 0;
    if (count > 1) {
      this.joined.set(orderId, count - 1);
      return;
    }
    this.joined.delete(orderId);
    if (this.socket?.connected) {
      this.socket.emit('tracking:leave-order', { orderId });
    }
  }

  /** Devuelve la funcion que quita el listener. */
  on<T = unknown>(event: string, handler: (payload: T) => void): () => void {
    const h = handler as Handler;
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(h);
    this.socket?.on(event, h);
    return () => {
      set.delete(h);
      this.socket?.off(event, h);
    };
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  disconnect(): void {
    this.clearRetry();
    this.authRetries = 0;
    this.joined.clear();
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}

export const socketService = new SocketService();
