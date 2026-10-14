import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState } from '@/components/ui';
import { useAuth } from '@/store/auth.store';
import { makeStyles } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';

/** Sesion guardada pero sin red y sin perfil en cache: no se puede decidir aun. */
export function OfflineGate() {
  const styles = useStyles();
  const error = useAuth((s) => s.error);
  const bootstrap = useAuth((s) => s.bootstrap);
  const [loading, setLoading] = useState(false);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Sin conexión"
          message={error ?? 'No pudimos comunicarnos con La Ruta RD.'}
          action={
            <Button
              label="Reintentar"
              icon="refresh"
              loading={loading}
              onPress={async () => {
                setLoading(true);
                useAuth.setState({ error: null });
                await bootstrap();
                setLoading(false);
              }}
              style={styles.button}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    body: { flex: 1, justifyContent: 'center', padding: spacing.xl },
    button: { alignSelf: 'stretch', marginTop: spacing.lg },
  }),
);
