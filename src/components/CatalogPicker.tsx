import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from './Sheet';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';
import { foldName } from '@/utils/maps';

/** Hoja con buscador para elegir provincia o municipio del catalogo. */
export function CatalogPicker<T extends { id: string; name: string }>({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: T[];
  selected?: string;
  onClose: () => void;
  onSelect: (option: T) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = foldName(query);
    return q ? options.filter((o) => foldName(o.name).includes(q)) : options;
  }, [options, query]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textDim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar"
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const active = foldName(item.name) === foldName(selected ?? '');
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSelect(item);
                setQuery('');
                onClose();
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.rowText, active && { color: colors.primaryText, fontWeight: '700' }]}>{item.name}</Text>
              {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 },
    list: { maxHeight: 360 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
    },
    rowText: { fontSize: 15, color: colors.text },
  }),
);
