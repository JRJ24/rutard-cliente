import { Platform } from 'react-native';
import { http, request, unwrap } from './client';
import type { ApiResponse, AuthResult, CustomerType, DocumentType, Me } from '@/types/api';

// Movil (no `web`): el refresh dura 30 dias en vez de 7.
const platform = () => (Platform.OS === 'ios' ? 'ios' : 'android');
const deviceName = () => `rutard-cliente-${Platform.OS}`;

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  customerType: CustomerType;
  documentType: DocumentType;
  documentNumber: string;
  companyName?: string;
  billingEmail?: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResult> {
    const res = await http.post<ApiResponse<AuthResult>>('/auth/login', {
      email,
      password,
      platform: platform(),
      deviceName: deviceName(),
    });
    return unwrap(res.data);
  },

  async register(input: RegisterInput): Promise<AuthResult> {
    const res = await http.post<ApiResponse<AuthResult>>('/auth/register', {
      ...input,
      platform: platform(),
      deviceName: deviceName(),
    });
    return unwrap(res.data);
  },

  me() {
    return request<Me>({ method: 'GET', url: '/auth/me' });
  },

  /**
   * Best-effort. Con `accessToken` revoca esa sesion aunque el cliente ya haya
   * limpiado el token global (o tenga el de un login posterior).
   */
  async logout(accessToken?: string): Promise<void> {
    await http
      .post('/auth/logout', undefined, {
        skipAuthRefresh: true,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      .catch(() => undefined);
  },

  logoutAll() {
    return request<{ revokedCount: number }>({ method: 'POST', url: '/auth/logout-all' });
  },
};
