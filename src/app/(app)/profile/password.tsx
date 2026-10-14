import { useState } from 'react';
import { router } from 'expo-router';
import { usersApi } from '@/api/users.api';
import { queryClient, queryKeys } from '@/api/query';
import { Screen } from '@/components/Screen';
import { Button, Muted, TextField } from '@/components/ui';
import { toast } from '@/store/toast.store';
import { friendlyError } from '@/utils/errors';
import { passwordError } from '@/utils/validation';

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const nextError = touched ? passwordError(next) : null;
  const repeatError = touched && repeat !== next ? 'No coincide con la nueva contraseña.' : null;

  async function save() {
    setTouched(true);
    if (!current || passwordError(next) || repeat !== next) return;
    setSaving(true);
    try {
      await usersApi.changePassword(current, next);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      toast.success('Contraseña actualizada', 'Cerramos tus otras sesiones por seguridad.');
      router.back();
    } catch (e) {
      toast.error('No se pudo cambiar', friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button label="Actualizar contraseña" icon="checkmark" loading={saving} disabled={!current || !next} onPress={() => void save()} />
      }
    >
      <Muted>Usa al menos 8 caracteres combinando letras y números.</Muted>
      <TextField label="Contraseña actual" icon="lock-closed-outline" value={current} onChangeText={setCurrent} secure autoCapitalize="none" />
      <TextField label="Nueva contraseña" icon="key-outline" value={next} onChangeText={setNext} secure autoCapitalize="none" error={nextError} />
      <TextField
        label="Repite la nueva contraseña"
        icon="key-outline"
        value={repeat}
        onChangeText={setRepeat}
        secure
        autoCapitalize="none"
        error={repeatError}
      />
    </Screen>
  );
}
