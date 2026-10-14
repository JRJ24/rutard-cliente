import { request } from './client';
import type { SessionInfo } from '@/types/api';

/** Seguridad de la cuenta: contrasena y dispositivos con sesion abierta. */
export const accountApi = {
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return request<{ revokedSessions: number }>({ method: 'POST', url: '/auth/change-password', data: input });
  },

  sessions() {
    return request<SessionInfo[]>({ method: 'GET', url: '/sessions/me' });
  },

  revokeSession(id: string) {
    return request<void>({ method: 'DELETE', url: `/sessions/${id}` });
  },
};
