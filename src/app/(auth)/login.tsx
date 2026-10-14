import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BrandMark, Screen } from '@/components/Screen';
import { Button, ErrorBanner, Muted, TextField } from '@/components/ui';
import { useAuth } from '@/store/auth.store';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';

export default function LoginScreen() {
  const styles = useStyles();
  const { typography } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuth((s) => s.login);
  const status = useAuth((s) => s.status);
  const error = useAuth((s) => s.error);
  const clearError = useAuth((s) => s.clearError);
  const loading = status === 'authenticating';
  const canSubmit = email.trim().length > 3 && password.length > 0 && !loading;

  useEffect(() => clearError, [clearError]);

  const submit = () => {
    if (canSubmit) void login(email, password);
  };

  return (
    <Screen contentStyle={styles.inner}>
      <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.brand}>
        <BrandMark />
        <Text style={styles.eyebrow}>La Ruta RD</Text>
        <Text style={typography.display}>Tus envíos, en camino</Text>
        <Muted>Solicita, paga y sigue tus envíos en tiempo real.</Muted>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify().damping(16)} style={styles.form}>
        <TextField
          label="Correo"
          icon="mail-outline"
          placeholder="tu@correo.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />
        <TextField
          label="Contraseña"
          icon="lock-closed-outline"
          placeholder="Tu contraseña"
          secure
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? <ErrorBanner message={error} /> : null}
        <Button label={loading ? 'Entrando…' : 'Entrar'} icon="arrow-forward" loading={loading} disabled={!canSubmit} onPress={submit} />
        <View style={styles.divider} />
        <Button
          label="Crear una cuenta"
          variant="secondary"
          icon="person-add-outline"
          onPress={() => {
            clearError();
            router.push('/register');
          }}
        />
        <Muted style={styles.center}>¿Olvidaste tu contraseña? Escríbenos a soporte.</Muted>
      </Animated.View>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    inner: { flexGrow: 1, justifyContent: 'center', gap: spacing.xxl, padding: spacing.xl },
    brand: { gap: spacing.sm },
    eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.sm },
    form: { gap: spacing.lg },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    center: { textAlign: 'center' },
  }),
);
