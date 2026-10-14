import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/theme';

/**
 * Contenedor de pantalla con scroll, teclado y pull-to-refresh. Las pantallas
 * con header del Stack pasan `edges={['bottom']}`.
 */
export function Screen({
  children,
  edges = ['top', 'bottom'],
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  footer,
}: {
  children: ReactNode;
  edges?: Edge[];
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  /** Barra fija abajo (boton principal). */
  footer?: ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={Boolean(refreshing)}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Marca «R» de La Ruta RD (igual que el portal web) hasta tener el logo final. */
export function BrandMark({ size = 56 }: { size?: number }) {
  const { colors, elevation } = useTheme();
  return (
    <View
      accessibilityLabel="La Ruta RD"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        elevation.raised,
      ]}
    >
      <Text style={{ color: colors.onPrimary, fontSize: size * 0.5, fontWeight: '700' }}>R</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      gap: spacing.sm,
    },
  }),
);
