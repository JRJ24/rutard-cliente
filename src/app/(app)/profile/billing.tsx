import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import { queryClient, queryKeys } from '@/api/query';
import { Screen } from '@/components/Screen';
import { Button, Card, ErrorBanner, Muted, Skeleton } from '@/components/ui';
import { emptyFiscal, FiscalFields } from '@/features/profile/FiscalFields';
import { useCustomerMe } from '@/hooks/queries';
import { toast } from '@/store/toast.store';
import { friendlyError } from '@/utils/errors';
import { fiscalPayload, validateFiscal, type FiscalValues } from '@/utils/validation';
import type { CustomerProfile } from '@/types/api';

export default function BillingScreen() {
  const customer = useCustomerMe();
  if (customer.isPending) {
    return (
      <Screen edges={['bottom']}>
        <Skeleton height={320} />
      </Screen>
    );
  }
  // `key`: si llega otro perfil, el formulario arranca de nuevo con sus datos.
  return <BillingForm key={customer.data?.id ?? 'none'} customer={customer.data} />;
}

function BillingForm({ customer: c }: { customer?: CustomerProfile }) {
  const [values, setValues] = useState<FiscalValues>(() =>
    c
      ? {
          customerType: c.customerType,
          documentType: c.documentType,
          documentNumber: c.documentNumber,
          companyName: c.companyName ?? '',
          billingEmail: c.billingEmail ?? '',
        }
      : emptyFiscal,
  );
  const [touched, setTouched] = useState(false);

  const errors = validateFiscal(values);
  const save = useMutation({
    mutationFn: () => customersApi.updateMe(fiscalPayload(values)),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.customerMe, profile);
      toast.success('Datos de facturación actualizados');
    },
  });

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label="Guardar"
          icon="checkmark"
          loading={save.isPending}
          onPress={() => {
            setTouched(true);
            if (Object.keys(errors).length === 0) save.mutate();
          }}
        />
      }
    >
      <Muted>Estos datos aparecen en tus comprobantes fiscales.</Muted>
      <Card>
        <FiscalFields values={values} errors={touched ? errors : {}} onChange={setValues} />
      </Card>
      {save.error ? <ErrorBanner message={friendlyError(save.error)} /> : null}
    </Screen>
  );
}
