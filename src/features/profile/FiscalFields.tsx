import { View } from 'react-native';
import { ChoiceChips } from '@/components/ChoiceChips';
import { TextField } from '@/components/ui';
import { spacing } from '@/theme/theme';
import type { CustomerType, DocumentType } from '@/types/api';
import type { FieldErrors, FiscalValues } from '@/utils/validation';

export const documentTypeLabels: Record<DocumentType, string> = {
  ID: 'Cédula',
  RNC: 'RNC',
  PASSPORT: 'Pasaporte',
};

export const customerTypeLabels: Record<CustomerType, string> = {
  INDIVIDUAL: 'Personal',
  BUSINESS: 'Empresa',
};

export const emptyFiscal: FiscalValues = {
  customerType: 'INDIVIDUAL',
  documentType: 'ID',
  documentNumber: '',
  companyName: '',
  billingEmail: '',
};

/** Datos fiscales del cliente: registro, completar perfil y facturacion. */
export function FiscalFields({
  values,
  errors,
  onChange,
}: {
  values: FiscalValues;
  errors: FieldErrors<keyof FiscalValues>;
  onChange: (next: FiscalValues) => void;
}) {
  const set = <K extends keyof FiscalValues>(key: K, value: FiscalValues[K]) => onChange({ ...values, [key]: value });
  const business = values.customerType === 'BUSINESS';
  return (
    <View style={{ gap: spacing.lg }}>
      <ChoiceChips<CustomerType>
        label="Tipo de cliente"
        value={values.customerType}
        choices={[
          { key: 'INDIVIDUAL', label: customerTypeLabels.INDIVIDUAL, icon: 'person-outline' },
          { key: 'BUSINESS', label: customerTypeLabels.BUSINESS, icon: 'business-outline' },
        ]}
        // Una empresa factura con RNC por defecto, como en el portal web.
        onChange={(customerType) =>
          onChange({
            ...values,
            customerType,
            documentType: customerType === 'BUSINESS' ? 'RNC' : values.documentType === 'RNC' ? 'ID' : values.documentType,
          })
        }
      />
      {business ? (
        <TextField
          label="Razón social"
          icon="business-outline"
          placeholder="Nombre de la empresa"
          value={values.companyName}
          onChangeText={(v) => set('companyName', v)}
          error={errors.companyName}
          maxLength={120}
        />
      ) : null}
      <ChoiceChips<DocumentType>
        label="Documento"
        value={values.documentType}
        choices={(['ID', 'RNC', 'PASSPORT'] as DocumentType[]).map((key) => ({ key, label: documentTypeLabels[key] }))}
        onChange={(v) => set('documentType', v)}
      />
      <TextField
        label={`Número de ${documentTypeLabels[values.documentType].toLowerCase()}`}
        icon="card-outline"
        placeholder={values.documentType === 'ID' ? '001-0000000-0' : values.documentType === 'RNC' ? '1-01-00000-0' : 'Número'}
        value={values.documentNumber}
        onChangeText={(v) => set('documentNumber', v)}
        error={errors.documentNumber}
        autoCapitalize="characters"
        maxLength={40}
      />
      <TextField
        label="Correo de facturación (opcional)"
        icon="receipt-outline"
        placeholder="facturas@empresa.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={values.billingEmail}
        onChangeText={(v) => set('billingEmail', v)}
        error={errors.billingEmail}
      />
    </View>
  );
}
