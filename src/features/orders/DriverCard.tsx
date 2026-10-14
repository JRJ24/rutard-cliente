import { Linking, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Card, IconButton } from '@/components/ui';
import { assignmentStatusLabel } from './labels';
import { makeStyles } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import type { OrderAssignmentView } from '@/utils/orders';

/** WhatsApp en RD: 10 digitos locales llevan el codigo de pais 1. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `1${digits}` : digits;
}

export function DriverCard({ assignment, etaText }: { assignment: OrderAssignmentView; etaText?: string | null }) {
  const styles = useStyles();
  const phone = assignment.driverPhone;
  return (
    <Card>
      <View style={styles.row}>
        <Avatar name={assignment.driverName} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={1}>
            {assignment.driverName ?? 'Conductor asignado'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[assignment.vehicleLabel, assignment.vehicleColor, assignment.vehiclePlate].filter(Boolean).join(' · ') || 'Vehículo por confirmar'}
          </Text>
        </View>
        {phone ? (
          <View style={styles.actions}>
            <IconButton
              icon="logo-whatsapp"
              tone="success"
              accessibilityLabel="Escribir al conductor por WhatsApp"
              onPress={() => void Linking.openURL(`https://wa.me/${whatsappNumber(phone)}`)}
            />
            <IconButton
              icon="call"
              tone="primary"
              accessibilityLabel="Llamar al conductor"
              onPress={() => void Linking.openURL(`tel:${phone}`)}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <Badge
          label={assignmentStatusLabel(assignment.assignmentStatus)}
          tone={assignment.assignmentStatus === 'ACCEPTED' ? 'primary' : 'warning'}
        />
        {etaText ? <Badge label={etaText} tone="info" icon="time-outline" /> : null}
      </View>
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
    name: { fontSize: 16, fontWeight: '700', color: colors.text },
    meta: { fontSize: 13, color: colors.textMuted },
    actions: { flexDirection: 'row', gap: spacing.sm },
  }),
);
