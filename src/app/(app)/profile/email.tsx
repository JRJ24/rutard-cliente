import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { usersApi } from '@/api/users.api';
import { Screen } from '@/components/Screen';
import { Button, Muted, TextField } from '@/components/ui';
import { useAuth } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { friendlyError } from '@/utils/errors';
import { emailError } from '@/utils/validation';

/** Dos pasos: correo nuevo + contraseña → codigo de 6 digitos. */
export default function ChangeEmailScreen() {
  const { typography } = useTheme();
  const user = useAuth((s) => s.user);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailErr = touched ? emailError(email) : null;

  async function done() {
    await refreshProfile();
    toast.success('Correo actualizado', 'Usa el nuevo correo para iniciar sesión.');
    router.back();
  }

  async function request() {
    setTouched(true);
    if (emailError(email) || !password) return;
    setBusy(true);
    try {
      const res = await usersApi.requestEmailChange(email.trim().toLowerCase(), password);
      if (res.status === 'CHANGED') {
        await done();
        return;
      }
      setSentTo(res.sentTo || email.trim());
      toast.info('Te enviamos un código', 'Revisa tu bandeja de entrada.');
    } catch (e) {
      toast.error('No se pudo solicitar', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!/^\d{6}$/.test(code)) {
      toast.warning('Código incompleto', 'Escribe los 6 dígitos que recibiste.');
      return;
    }
    setBusy(true);
    try {
      await usersApi.confirmEmailChange(code);
      await done();
    } catch (e) {
      toast.error('Código no válido', friendlyError(e, 'Revisa el código o solicita uno nuevo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      edges={['bottom']}
      footer={
        !sentTo ? (
          <Button label="Enviar código" icon="send" loading={busy} disabled={!email || !password} onPress={() => void request()} />
        ) : (
          <Button label="Confirmar correo" icon="checkmark" loading={busy} disabled={code.length < 6} onPress={() => void confirm()} />
        )
      }
    >
      {!sentTo ? (
        <>
          <Muted>Correo actual: {user?.email}</Muted>
          <TextField
            label="Correo nuevo"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={emailErr}
          />
          <TextField
            label="Tu contraseña"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secure
            autoCapitalize="none"
            hint="La pedimos para confirmar que eres tú."
          />
        </>
      ) : (
        <>
          <Text style={typography.heading}>Revisa tu correo</Text>
          <Muted>Enviamos un código de 6 dígitos a {sentTo}.</Muted>
          <TextField
            label="Código"
            icon="keypad-outline"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
          />
          <Button label="Usar otro correo" variant="ghost" size="md" onPress={() => setSentTo(null)} />
        </>
      )}
    </Screen>
  );
}
