import { http, unwrap } from './client';
import type { ApiResponse, AppNotification } from '@/types/api';

export const notificationsApi = {
  async listMine(): Promise<AppNotification[]> {
    const res = await http.get<ApiResponse<AppNotification[]>>(
      '/notifications/me',
    );
    return unwrap(res.data);
  },

  async markRead(id: string): Promise<AppNotification> {
    const res = await http.patch<ApiResponse<AppNotification>>(
      `/notifications/${id}/read`,
      {},
    );
    return unwrap(res.data);
  },
};
