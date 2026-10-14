import '@/services/notifications/fcm-background-handler';

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme as NavTheme } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/api/query';
import { ToastHost } from '@/components/ToastHost';
import { OfflineGate } from '@/features/app/OfflineGate';
import { useAppLifecycle } from '@/features/app/useAppLifecycle';
import { useAuth } from '@/store/auth.store';
import { useTheme, useThemeMode } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function navThemeFor(theme: Theme): NavTheme {
  const base = theme.isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };
}

function RootNavigator() {
  const status = useAuth((s) => s.status);
  const signedIn = status === 'authenticated';
  useAppLifecycle();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  const themeHydrated = useThemeMode((s) => s.hydrated);
  const hydrateTheme = useThemeMode((s) => s.hydrate);
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const error = useAuth((s) => s.error);

  useEffect(() => {
    void hydrateTheme();
    void bootstrap();
  }, [hydrateTheme, bootstrap]);

  // `idle` = bootstrap aun no decide (o no hubo red y no hay perfil guardado).
  const deciding = status === 'idle' && !error;
  const ready = themeHydrated && !deciding;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navThemeFor(theme)}>
            <StatusBar style={theme.isDark ? 'light' : 'dark'} />
            {!ready ? (
              <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : status === 'idle' ? (
              <OfflineGate />
            ) : (
              <RootNavigator />
            )}
            <ToastHost />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
