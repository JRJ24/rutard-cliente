import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { incidentsApi } from '@/api/incidents.api';
import { queryClient, queryKeys } from '@/api/query';
import { Badge, Button, Card, IconButton, Muted, Overline, TextField } from '@/components/ui';
import { incidentStatusLabels, incidentTypeLabels } from '@/constants/status.constants';
import { useIncidents } from '@/hooks/queries';
import { toast } from '@/store/toast.store';
import { makeStyles } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import type { Incident } from '@/types/api';
import { friendlyError } from '@/utils/errors';
import { formatRelativeDay } from '@/utils/format';

function IncidentItem({ incident, orderId }: { incident: Incident; orderId: string }) {
  const styles = useStyles();
  const [comment, setComment] = useState('');
  const send = useMutation({
    mutationFn: () => incidentsApi.comment(incident.id, comment.trim().slice(0, 1000)),
    onSuccess: () => {
      setComment('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.incidents(orderId) });
    },
    onError: (e) => toast.error('No se envió el comentario', friendlyError(e)),
  });
  const open = incident.status === 'OPEN' || incident.status === 'IN_REVIEW';

  return (
    <View style={styles.item}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={2}>
          {incident.title}
        </Text>
        <Badge label={incidentStatusLabels[incident.status]} tone={open ? 'warning' : 'success'} />
      </View>
      <Muted>
        {incidentTypeLabels[incident.incidentType]} · {formatRelativeDay(incident.reportedAt)}
      </Muted>
      <Text style={styles.body}>{incident.description}</Text>
      {(incident.incidentsComments ?? []).map((c) => (
        <View key={c.id} style={styles.comment}>
          <Text style={styles.body}>{c.comment}</Text>
          <Muted>{formatRelativeDay(c.createdAt)}</Muted>
        </View>
      ))}
      {open ? (
        <View style={styles.reply}>
          <TextField label="Responder" value={comment} onChangeText={setComment} maxLength={1000} style={{ flex: 1 }} />
          <IconButton
            icon="send"
            tone="primary"
            accessibilityLabel="Enviar comentario"
            onPress={() => comment.trim() && !send.isPending && send.mutate()}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Incidencias de la orden con sus comentarios (la torre de control responde aqui). */
export function IncidentsSection({ orderId, canReport }: { orderId: string; canReport: boolean }) {
  const incidents = useIncidents(orderId);
  const list = incidents.data ?? [];
  if (list.length === 0 && !canReport) return null;
  return (
    <Card>
      <Overline>Incidencias</Overline>
      {list.length === 0 ? <Muted>¿Algo no va bien? Avísanos y te respondemos aquí.</Muted> : null}
      {list.map((incident) => (
        <IncidentItem key={incident.id} incident={incident} orderId={orderId} />
      ))}
      {canReport ? (
        <Button
          label="Reportar un problema"
          variant="secondary"
          size="md"
          icon="warning-outline"
          onPress={() => router.push({ pathname: '/orders/incident', params: { orderId } })}
        />
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    item: { gap: 4, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    body: { fontSize: 14, color: colors.text },
    comment: { marginLeft: spacing.md, padding: spacing.sm, borderRadius: 10, backgroundColor: colors.surfaceAlt, gap: 2 },
    reply: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  }),
);
