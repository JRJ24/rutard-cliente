import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { absoluteUrl } from '@/config/env';
import { Card, KeyValue, Muted, Overline, Skeleton } from '@/components/ui';
import { validationStatusLabels } from '@/constants/status.constants';
import { useEvidence } from '@/hooks/queries';
import { makeStyles } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import { formatDateTime } from '@/utils/format';

/** Foto y firma de la entrega (solo lectura para el cliente). */
export function EvidenceSection({ orderId }: { orderId: string }) {
  const styles = useStyles();
  const evidence = useEvidence(orderId);
  const [preview, setPreview] = useState<string | null>(null);

  if (evidence.isPending) return <Skeleton height={140} />;
  const bundles = evidence.data ?? [];
  if (bundles.length === 0) return null;

  return (
    <Card>
      <Overline>Prueba de entrega</Overline>
      {bundles.map(({ proof, attachments }) => {
        const images = [
          ...attachments.filter((a) => a.mimeType.startsWith('image/')).map((a) => absoluteUrl(a.fileUrl)),
          ...(proof.signatures ?? []).map((s) => absoluteUrl(s.signatureUrl)),
        ].filter((url, i, all): url is string => Boolean(url) && all.indexOf(url) === i);
        return (
          <View key={proof.id} style={{ gap: spacing.sm }}>
            <KeyValue label="Recibió" value={proof.recipientName} />
            <KeyValue label="Fecha" value={formatDateTime(proof.capturedAt)} />
            <KeyValue label="Validación" value={validationStatusLabels[proof.validationStatus]} />
            {proof.notes ? <Muted>{proof.notes}</Muted> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {images.map((url) => (
                <Pressable key={url} onPress={() => setPreview(url)} accessibilityLabel="Ver imagen">
                  <Image source={{ uri: url }} style={styles.thumb} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
      })}
      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPreview(null)}>
          {preview ? <Image source={{ uri: preview }} style={styles.full} resizeMode="contain" /> : null}
          <Text style={styles.close}>Toca para cerrar</Text>
        </Pressable>
      </Modal>
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    thumb: { width: 110, height: 110, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
    full: { width: '92%', height: '75%', backgroundColor: colors.white, borderRadius: radius.md },
    close: { color: '#FFFFFF', marginTop: spacing.lg },
  }),
);
