import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Card, ErrorBanner, Muted, Overline, TextField } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { emptyFiscal, FiscalFields } from '@/features/profile/FiscalFields';
import { useAuth } from '@/store/auth.store';
import { makeStyles } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import { cleanPhone } from '@/utils/format';
import {
  emailError,
  fiscalPayload,
  passwordError,
  phoneError,
  validateFiscal,
  type FieldErrors,
  type FiscalValues,
} from '@/utils/validation';

type AccountField = 'fullName' | 'phone' | 'email' | 'password';

export default function RegisterScreen() {
  const styles = useStyles();
  const register = useAuth((s) => s.register);
  const status = useAuth((s) => s.status);
  const error = useAuth((s) => s.error);
  const clearError = useAuth((s) => s.clearError);
  const loading = status === 'authenticating';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fiscal, setFiscal] = useState<FiscalValues>(emptyFiscal);
  const [touched, setTouched] = useState(false);

  useEffect(() => clearError, [clearError]);

  const accountErrors: FieldErrors<AccountField> = {};
  if (fullName.trim().length < 3) accountErrors.fullName = 'Escribe tu nombre completo.';
  const pe = phoneError(phone);
  if (pe) accountErrors.phone = pe;
  const ee = emailError(email);
  if (ee) accountErrors.email = ee;
  const pwe = passwordError(password);
  if (pwe) accountErrors.password = pwe;
  const fiscalErrors = validateFiscal(fiscal);
  const valid = Object.keys(accountErrors).length === 0 && Object.keys(fiscalErrors).length === 0;
  const shown = touched ? accountErrors : {};

  const submit = () => {
    setTouched(true);
    if (!valid || loading) return;
    // Al registrarse, la sesion empieza y el guard lleva a la app.
    void register({
      fullName: fullName.trim(),
      phone: cleanPhone(phone),
      email: email.trim(),
      password,
      ...fiscalPayload(fiscal),
    });
  };

  return (
    <Screen edges={['bottom']}>
      <Muted>Con tu cuenta solicitas envíos, pagas y sigues al conductor en vivo.</Muted>
      <Card>
        <Overline>Tus datos</Overline>
        <TextField
          label="Nombre completo"
          icon="person-outline"
          placeholder="Juan Pérez"
          autoComplete="name"
          value={fullName}
          onChangeText={setFullName}
          error={shown.fullName}
          maxLength={120}
        />
        <TextField
          label="Teléfono"
          icon="call-outline"
          placeholder="8095551234"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          error={shown.phone}
        />
        <TextField
          label="Correo"
          icon="mail-outline"
          placeholder="tu@correo.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={shown.email}
        />
        <TextField
          label="Contraseña"
          icon="lock-closed-outline"
          placeholder="Mínimo 8, con letras y números"
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          error={shown.password}
        />
      </Card>
      <Card>
        <Overline>Facturación</Overline>
        <FiscalFields values={fiscal} errors={touched ? fiscalErrors : {}} onChange={setFiscal} />
      </Card>
      {error ? <ErrorBanner message={error} /> : null}
      <Button label="Crear cuenta" icon="checkmark" loading={loading} onPress={submit} />
      <Muted style={styles.center}>Al crear tu cuenta aceptas los términos del servicio de La Ruta RD.</Muted>
    </Screen>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    center: { textAlign: 'center', marginTop: spacing.sm },
  }),
);
