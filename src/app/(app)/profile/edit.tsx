import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { usersApi } from '@/api/users.api';
import { Screen } from '@/components/Screen';
import { Avatar, Button, Muted, TextField } from '@/components/ui';
import { useAvatarPicker } from '@/features/profile/useAvatarPicker';
import { useAuth } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/theme';
import { friendlyError } from '@/utils/errors';
import { cleanPhone } from '@/utils/format';
import { phoneError } from '@/utils/validation';

export default function EditProfileScreen() {
  const user = useAuth((s) => s.user);
  const applyProfile = useAuth((s) => s.applyProfile);
  const { pickAvatar, busy: avatarBusy } = useAvatarPicker();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const phoneClean = cleanPhone(phone);
  const nameError = touched && fullName.trim().length < 3 ? 'Mínimo 3 caracteres.' : null;
  const phoneErr = touched && phoneClean ? phoneError(phoneClean) : null;
  const dirty = fullName.trim() !== (user?.fullName ?? '') || phoneClean !== (user?.phone ?? '');

  async function save() {
    setTouched(true);
    if (fullName.trim().length < 3 || (phoneClean && phoneError(phoneClean))) return;
    setSaving(true);
    try {
      const profile = await usersApi.update({ fullName: fullName.trim(), ...(phoneClean ? { phone: phoneClean } : {}) });
      applyProfile(profile);
      toast.success('Perfil actualizado');
      router.back();
    } catch (e) {
      toast.error('No se pudo guardar', friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      edges={['bottom']}
      footer={<Button label="Guardar cambios" icon="checkmark" loading={saving} disabled={!dirty} onPress={() => void save()} />}
    >
      <View style={styles.avatar}>
        <Avatar name={fullName} uri={user?.avatarUrl} size={96} editable onPress={avatarBusy ? undefined : () => void pickAvatar()} />
        <Muted>{avatarBusy ? 'Subiendo foto…' : 'Toca la foto para cambiarla'}</Muted>
      </View>
      <TextField label="Nombre completo" icon="person-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" error={nameError} />
      <TextField
        label="Teléfono"
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="8095551234"
        error={phoneErr}
        hint="El conductor te contacta a este número."
      />
      <TextField label="Correo" icon="mail-outline" value={user?.email ?? ''} editable={false} hint="Cámbialo desde «Cambiar correo»." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
});
