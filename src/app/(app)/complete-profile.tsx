import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import { queryClient, queryKeys } from '@/api/query';
import { Screen } from '@/components/Screen';
import { Button, Card, ErrorBanner, Muted } from '@/components/ui';
import { emptyFiscal, FiscalFields } from '@/features/profile/FiscalFields';
import { useAuth } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { friendlyError } from '@/utils/errors';
import { fiscalPayload, validateFiscal, type FiscalValues } from '@/utils/validation';

/** La cuenta existe pero sin perfil fiscal: sin el no se puede cotizar ni facturar. */
export default function CompleteProfileScreen() {
  const logout = useAuth((s) => s.logout);
  const [values, setValues] = useState<FiscalValues>(emptyFiscal);
  const [touched, setTouched] = useState(false);
  const errors = validateFiscal(values);

  const save = useMutation({
    mutationFn: () => customersApi.createMe(fiscalPayload(values)),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.customerMe, profile);
      toast.success('Perfil completo', 'Ya puedes solicitar envíos.');
    },
  });

  return (
    <Screen edges={['bottom']}>
      <Muted>Necesitamos tus datos de facturación para emitir tus comprobantes.</Muted>
      <Card>
        <FiscalFields values={values} errors={touched ? errors : {}} onChange={setValues} />
      </Card>
      {save.error ? <ErrorBanner message={friendlyError(save.error)} /> : null}
      <Button
        label="Guardar y continuar"
        icon="checkmark"
        loading={save.isPending}
        onPress={() => {
          setTouched(true);
          if (Object.keys(errors).length === 0) save.mutate();
        }}
      />
      <Button label="Cerrar sesión" variant="ghost" onPress={() => void logout()} />
    </Screen>
  );
}
