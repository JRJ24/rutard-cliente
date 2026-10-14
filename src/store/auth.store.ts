import axios from 'axios';
import { create } from 'zustand';
import { authApi, type RegisterInput } from '@/api/auth.api';
import { usersApi } from '@/api/users.api';
import { apiClient } from '@/api/client';
import type { ApiError, AuthResult, Role, UserProfile } from '@/types/api';
import { secureStorage } from '@/services/storage/secure-storage';
import { appStorage, STORAGE_KEYS } from '@/services/storage/app-storage';
import { pushNotifications } from '@/services/notifications/push-notifications.service';
import { useConnectivity } from '@/store/connectivity.store';
import { friendlyError } from '@/utils/errors';

type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'unauthenticated';

/** Lo que la app necesita del usuario; `phone`/`avatarUrl` llegan de /users/me. */
export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
  status: string;
  roles: Role[];
}

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  /** Datos editables (telefono, foto) desde GET /users/me. */
  refreshProfile: () => Promise<void>;
  applyProfile: (profile: Partial<UserProfile>) => void;
}

const NOT_CUSTOMER = 'Esta cuenta no es de cliente. Usa la app de La Ruta RD para conductores.';
const OFFLINE = 'Sin conexión con el servidor. Revisa tu red e intenta de nuevo.';
const ACCOUNT_CLOSED = ['AUTH_ACCOUNT_BLOCKED', 'AUTH_ACCOUNT_INACTIVE'];

// Un solo cierre de sesion a la vez: el handler de 401, bootstrap y el boton
// pueden coincidir, y un login nuevo espera a que termine la revocacion.
let loggingOut: Promise<void> | null = null;
// Cambia en cada login y logout: una respuesta tardia de bootstrap no debe
// pisar la sesion que vino despues.
let sessionEpoch = 0;
// bootstrap no pudo validar la sesion por falta de red.
let revalidatePending = false;

/** Solo el servidor invalida la sesion: 401 o cuenta bloqueada/inactiva. */
function isSessionInvalid(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) {
    return false;
  }
  const { status, data } = error.response;
  const code = (data as Partial<ApiError> | undefined)?.error?.code;
  return status === 401 || (status === 403 && code !== undefined && ACCOUNT_CLOSED.includes(code));
}

function cacheProfile(user: SessionUser): void {
  void appStorage.set<SessionUser>(STORAGE_KEYS.authProfile, user).catch(() => undefined);
}

function toSessionUser(user: AuthResult['user']): SessionUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    roles: user.roles,
  };
}

function endSession(error: string | null): Promise<void> {
  if (loggingOut) {
    return loggingOut;
  }
  sessionEpoch++;
  revalidatePending = false;
  const token = apiClient.getAccessToken();
  // Sincrono: un refresh en curso ya no guarda sus tokens despues del clear.
  apiClient.resetSession(null);
  loggingOut = (async () => {
    await secureStorage.clear().catch(() => undefined);
    await appStorage.remove(STORAGE_KEYS.authProfile).catch(() => undefined);
    useAuth.setState({ status: 'unauthenticated', user: null, error });
    if (token) {
      // Con el token capturado: un login posterior nunca es el revocado.
      await pushNotifications.unregister(token).catch(() => undefined);
      await authApi.logout(token);
    }
  })().finally(() => {
    loggingOut = null;
  });
  return loggingOut;
}

export const useAuth = create<AuthState>((set, get) => {
  /** Guarda la sesion recien emitida por login o registro. */
  async function startSession(result: AuthResult): Promise<boolean> {
    if (!result.user.roles.includes('CUSTOMER')) {
      // El servidor no exige el rol: se revoca la sesion recien emitida.
      void authApi.logout(result.accessToken);
      set({ status: 'unauthenticated', error: NOT_CUSTOMER });
      return false;
    }
    sessionEpoch++;
    // Antes de guardar: un refresh de la sesion anterior no debe rotar ni
    // pisar los tokens nuevos.
    apiClient.resetSession(result.accessToken);
    await secureStorage.setTokens(result.accessToken, result.refreshToken);
    const user = toSessionUser(result.user);
    set({ status: 'authenticated', user, error: null });
    cacheProfile(user);
    void pushNotifications.register().catch(() => undefined);
    return true;
  }

  return {
    status: 'idle',
    user: null,
    error: null,

    async bootstrap() {
      // Solo una sesion activa puede expirar: un 401 tardio tras el logout no
      // repite el logout.
      apiClient.setUnauthorizedHandler(() => {
        if (get().status === 'authenticated') {
          void get().logout();
        }
      });

      const epoch = sessionEpoch;
      const token = await secureStorage.getAccessToken().catch(() => null);
      if (epoch !== sessionEpoch) return;
      if (!token) {
        set({ status: 'unauthenticated' });
        return;
      }
      apiClient.setAccessToken(token);
      try {
        const me = await authApi.me();
        if (epoch !== sessionEpoch) return;
        if (!me.roles.includes('CUSTOMER')) {
          await endSession(NOT_CUSTOMER);
          return;
        }
        const cached =
          get().user ?? (await appStorage.get<SessionUser>(STORAGE_KEYS.authProfile).catch(() => null));
        if (epoch !== sessionEpoch) return;
        const known = cached?.id === me.id ? cached : null;
        const user: SessionUser = {
          id: me.id,
          email: me.email,
          fullName: me.fullName,
          phone: known?.phone ?? '',
          avatarUrl: known?.avatarUrl ?? null,
          status: me.status,
          roles: me.roles,
        };
        set({ status: 'authenticated', user, error: null });
        cacheProfile(user);
        void pushNotifications.register().catch(() => undefined);
        void get().refreshProfile();
      } catch (error) {
        if (epoch !== sessionEpoch) return;
        if (isSessionInvalid(error)) {
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          await endSession(status === 403 ? friendlyError(error) : null);
          return;
        }
        // Sin red, timeout, 5xx o 429 el servidor no dijo que la sesion fuera
        // invalida: se conservan los tokens y se entra con el ultimo perfil.
        revalidatePending = true;
        if (get().status === 'authenticated') return;
        const cached = await appStorage.get<SessionUser>(STORAGE_KEYS.authProfile).catch(() => null);
        if (epoch !== sessionEpoch) return;
        set(cached ? { status: 'authenticated', user: cached, error: null } : { status: 'idle', error: OFFLINE });
      }
    },

    async login(email, password) {
      set({ status: 'authenticating', error: null });
      revalidatePending = false;
      // El logout en curso todavia borra el token push: registrar despues.
      await loggingOut;
      try {
        const result = await authApi.login(email.trim().toLowerCase(), password);
        const ok = await startSession(result);
        if (ok) void get().refreshProfile();
        return ok;
      } catch (error) {
        set({ status: 'unauthenticated', error: friendlyError(error, 'No se pudo iniciar sesión.') });
        return false;
      }
    },

    async register(input) {
      set({ status: 'authenticating', error: null });
      revalidatePending = false;
      await loggingOut;
      try {
        const result = await authApi.register({ ...input, email: input.email.trim().toLowerCase() });
        return await startSession(result);
      } catch (error) {
        set({ status: 'unauthenticated', error: friendlyError(error, 'No se pudo crear la cuenta.') });
        return false;
      }
    },

    logout() {
      return endSession(null);
    },

    clearError() {
      set({ error: null });
    },

    async refreshProfile() {
      const epoch = sessionEpoch;
      const profile = await usersApi.me().catch(() => null);
      if (profile && epoch === sessionEpoch && get().status === 'authenticated') {
        get().applyProfile(profile);
      }
    },

    applyProfile(profile) {
      const { user } = get();
      if (!user) return;
      const next: SessionUser = {
        ...user,
        ...(profile.fullName !== undefined ? { fullName: profile.fullName } : {}),
        ...(profile.email !== undefined ? { email: profile.email } : {}),
        ...(profile.phone !== undefined ? { phone: profile.phone ?? '' } : {}),
        ...(profile.avatarUrl !== undefined ? { avatarUrl: profile.avatarUrl } : {}),
      };
      set({ user: next });
      cacheProfile(next);
    },
  };
});

// Sin red, bootstrap dejo la sesion sin validar. La primera respuesta del
// servidor (markSynced) prueba que volvio la red y se revalida.
useConnectivity.subscribe((state, prev) => {
  if (!revalidatePending || !state.online || prev.online) return;
  const { status, bootstrap } = useAuth.getState();
  if (status === 'idle' || status === 'authenticated') {
    revalidatePending = false;
    void bootstrap();
  }
});
