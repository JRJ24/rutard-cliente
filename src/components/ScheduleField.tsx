import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from './Sheet';
import { Button } from './ui';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import { formatDateTime } from '@/utils/format';

/** Minimo de antelacion de una orden programada. */
const MIN_LEAD_MS = 60 * 60_000;

export function minScheduleDate(): Date {
  return new Date(Date.now() + MIN_LEAD_MS);
}

/** Fecha y hora de una orden programada (Android: dos dialogos; iOS: hoja). */
export function ScheduleField({
  value,
  onChange,
  error,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
  error?: string | null;
}) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosValue, setIosValue] = useState<Date>(value ?? minScheduleDate());

  const open = () => {
    const start = value ?? minScheduleDate();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        minimumDate: new Date(),
        onValueChange: (_e, date) => {
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            is24Hour: false,
            onValueChange: (_e2, time) => {
              const next = new Date(date);
              next.setHours(time.getHours(), time.getMinutes(), 0, 0);
              onChange(next);
            },
          });
        },
      });
      return;
    }
    setIosValue(start);
    setIosOpen(true);
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>Fecha y hora de recogida</Text>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={[styles.field, error ? { borderColor: colors.danger } : null]}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.value, !value && { color: colors.placeholder }]}>
          {value ? formatDateTime(value) : 'Elegir fecha y hora'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {Platform.OS === 'ios' ? (
        <Sheet visible={iosOpen} onClose={() => setIosOpen(false)} title="Fecha y hora de recogida">
          <RNDateTimePicker
            value={iosValue}
            mode="datetime"
            display="inline"
            minimumDate={new Date()}
            locale="es-DO"
            themeVariant={isDark ? 'dark' : 'light'}
            accentColor={colors.primary}
            onValueChange={(_e, date) => setIosValue(date)}
          />
          <Button
            label="Listo"
            onPress={() => {
              onChange(iosValue);
              setIosOpen(false);
            }}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    field: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    value: { fontSize: 16, color: colors.text, flex: 1 },
    error: { fontSize: 12, color: colors.dangerText, fontWeight: '600' },
  }),
);
