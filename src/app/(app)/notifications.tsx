import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, EmptyState, PulseDot } from '@/components/ui';
import { hrefForRoute } from '@/features/app/useAppLifecycle';
import { parseNotificationRoute } from '@/services/notifications/notification-routing.service';
import { useNotifications } from '@/store/notifications.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import { formatRelativeDay } from '@/utils/format';

export default function NotificationsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const items = useNotifications((s) => s.items);
  const load = useNotifications((s) => s.load);
  const markRead = useNotifications((s) => s.markRead);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      edges={['bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    >
      {items.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="Sin notificaciones" message="Te avisaremos de cada cambio en tus envíos." />
      ) : (
        items.map((n) => {
          const route = parseNotificationRoute(n.data);
          const href = route ? hrefForRoute(route) : null;
          return (
            <Card
              key={n.id}
              onPress={() => {
                if (!n.readAt) void markRead(n.id);
                if (href) router.push(href);
              }}
              style={!n.readAt ? { borderLeftWidth: 3, borderLeftColor: colors.primary } : undefined}
            >
              <View style={styles.head}>
                {!n.readAt ? <PulseDot color={colors.primary} /> : null}
                <Text style={styles.title} numberOfLines={2}>
                  {n.title}
                </Text>
                <Text style={styles.time}>{formatRelativeDay(n.createdAt)}</Text>
              </View>
              <Text style={styles.body}>{n.message}</Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    time: { fontSize: 12, color: colors.textDim },
    body: { fontSize: 14, color: colors.textMuted },
  }),
);
