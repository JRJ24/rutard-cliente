import { StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { queryClient, queryKeys } from '@/api/query';
import { Screen } from '@/components/Screen';
import { Card, ErrorBanner, Muted, Skeleton } from '@/components/ui';
import { useNotificationPreferences } from '@/hooks/queries';
import { toast } from '@/store/toast.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import type { NotificationCategory, NotificationPreference } from '@/types/api';
import { friendlyError } from '@/utils/errors';

const LABELS: Record<NotificationCategory, { title: string; hint: string }> = {
  ORDER_UPDATE: { title: 'Mis envíos', hint: 'Cambios de estado y conductor asignado.' },
  PAYMENT: { title: 'Pagos', hint: 'Pagos aprobados y pendientes.' },
  INCIDENT: { title: 'Incidencias', hint: 'Respuestas a tus reportes.' },
  PROMOTION: { title: 'Promociones', hint: 'Ofertas y novedades de La Ruta RD.' },
  SYSTEM: { title: 'Cuenta', hint: 'Avisos de seguridad y del sistema.' },
};

export default function NotificationPrefsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const prefs = useNotificationPreferences();

  const update = useMutation({
    mutationFn: (item: { category: NotificationCategory; push?: boolean; email?: boolean }) =>
      usersApi.updateNotificationPreferences([item]),
    onMutate: (item) => {
      // Optimista: el switch responde al toque.
      const prev = queryClient.getQueryData<NotificationPreference[]>(queryKeys.notificationPreferences);
      queryClient.setQueryData<NotificationPreference[]>(queryKeys.notificationPreferences, (list) =>
        (list ?? []).map((p) => (p.category === item.category ? { ...p, ...item } : p)),
      );
      return { prev };
    },
    onError: (e, _item, ctx) => {
      queryClient.setQueryData(queryKeys.notificationPreferences, ctx?.prev);
      toast.error('No se guardó', friendlyError(e));
    },
    onSuccess: (list) => queryClient.setQueryData(queryKeys.notificationPreferences, list),
  });

  const sw = (value: boolean, disabled: boolean, onChange: (v: boolean) => void) => (
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
      thumbColor={colors.white}
    />
  );

  return (
    <Screen edges={['bottom']}>
      <Muted>Los avisos de envíos, pagos y cuenta por push son obligatorios.</Muted>
      {prefs.error ? <ErrorBanner message={friendlyError(prefs.error)} onRetry={() => void prefs.refetch()} /> : null}
      {prefs.isPending ? (
        <Skeleton height={260} />
      ) : (
        (prefs.data ?? []).map((p) => (
          <Card key={p.category}>
            <Text style={styles.title}>{LABELS[p.category]?.title ?? p.category}</Text>
            <Muted>{LABELS[p.category]?.hint}</Muted>
            <View style={styles.row}>
              <Text style={styles.label}>Push</Text>
              {sw(p.push, p.locked, (push) => update.mutate({ category: p.category, push }))}
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Correo</Text>
              {sw(p.email, false, (email) => update.mutate({ category: p.category, email }))}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    title: { fontSize: 15, fontWeight: '700', color: colors.text },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    label: { fontSize: 14, color: colors.text },
  }),
);
