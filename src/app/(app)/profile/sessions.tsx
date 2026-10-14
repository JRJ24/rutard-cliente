import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { accountApi } from '@/api/account.api';
import { authApi } from '@/api/auth.api';
import { queryClient, queryKeys } from '@/api/query';
import { Screen } from '@/components/Screen';
import { ConfirmSheet } from '@/components/Sheet';
import { Badge, Button, Card, ErrorBanner, IconButton, ListRow, Muted, Skeleton } from '@/components/ui';
import { useSessions } from '@/hooks/queries';
import { useAuth } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { friendlyError } from '@/utils/errors';
import { formatRelativeDay } from '@/utils/format';

const PLATFORM: Record<string, string> = { ios: 'iPhone', android: 'Android', web: 'Navegador' };

export default function SessionsScreen() {
  const sessions = useSessions();
  const logout = useAuth((s) => s.logout);
  const [confirmAll, setConfirmAll] = useState(false);

  const revoke = useMutation({
    mutationFn: (id: string) => accountApi.revokeSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      toast.success('Sesión cerrada');
    },
    onError: (e) => toast.error('No se pudo cerrar', friendlyError(e)),
  });
  const revokeAll = useMutation({
    mutationFn: () => authApi.logoutAll(),
    // Cierra tambien esta sesion: se limpia lo local.
    onSettled: () => void logout(),
  });

  return (
    <Screen edges={['bottom']} refreshing={sessions.isRefetching} onRefresh={() => void sessions.refetch()}>
      <Muted>Dispositivos con tu cuenta abierta. Cierra los que no reconozcas.</Muted>
      {sessions.error ? <ErrorBanner message={friendlyError(sessions.error)} onRetry={() => void sessions.refetch()} /> : null}
      {sessions.isPending ? (
        <Skeleton height={180} />
      ) : (
        <Card style={{ padding: 0, gap: 0 }}>
          {(sessions.data ?? []).map((s) => (
            <ListRow
              key={s.id}
              icon={s.platform === 'web' ? 'desktop-outline' : 'phone-portrait-outline'}
              title={s.deviceName || PLATFORM[s.platform ?? ''] || 'Dispositivo'}
              subtitle={`${PLATFORM[s.platform ?? ''] ?? s.platform ?? ''} · Activa ${formatRelativeDay(s.lastActivityAt)}`}
              right={
                s.current ? (
                  <Badge label="Este" tone="primary" />
                ) : (
                  <IconButton
                    icon="close"
                    tone="danger"
                    size={36}
                    accessibilityLabel="Cerrar esta sesión"
                    onPress={() => revoke.mutate(s.id)}
                  />
                )
              }
            />
          ))}
        </Card>
      )}
      <Button label="Cerrar todas las sesiones" variant="danger" icon="log-out-outline" onPress={() => setConfirmAll(true)} loading={revokeAll.isPending} />
      <ConfirmSheet
        visible={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={() => revokeAll.mutate()}
        title="¿Cerrar todas las sesiones?"
        message="Saldrás también de este teléfono y tendrás que iniciar sesión de nuevo."
        confirmLabel="Cerrar todas"
        danger
        icon="log-out-outline"
      />
    </Screen>
  );
}
