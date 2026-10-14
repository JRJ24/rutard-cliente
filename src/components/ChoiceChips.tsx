import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import { haptic } from '@/utils/feedback';
import type { IconName } from './ui';

export interface Choice<K extends string> {
  key: K;
  label: string;
  icon?: IconName;
  disabled?: boolean;
}

/** Opciones excluyentes como chips (tipo de documento, etiqueta de direccion...). */
export function ChoiceChips<K extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label?: string;
  choices: Choice<K>[];
  value: K | null;
  onChange: (key: K) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row} accessibilityRole="radiogroup">
        {choices.map((choice) => {
          const selected = choice.key === value;
          return (
            <Pressable
              key={choice.key}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: choice.disabled }}
              disabled={choice.disabled}
              onPress={() => {
                haptic.tap();
                onChange(choice.key);
              }}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                choice.disabled && { opacity: 0.45 },
                pressed && { opacity: 0.8 },
              ]}
            >
              {choice.icon ? (
                <Ionicons name={choice.icon} size={16} color={selected ? colors.primaryText : colors.textMuted} />
              ) : null}
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    wrap: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      minHeight: 40,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    chipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    chipTextSelected: { color: colors.primaryText },
  }),
);
