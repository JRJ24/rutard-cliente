import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { incidentsApi } from '@/api/incidents.api';
import { queryClient, queryKeys } from '@/api/query';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { Button, Card, ErrorBanner, Muted, TextField } from '@/components/ui';
import { incidentTypeLabels, severityForIncident } from '@/constants/status.constants';
import { useLatestLocation, useOrder } from '@/hooks/queries';
import { toast } from '@/store/toast.store';
import type { IncidentType } from '@/types/api';
import { friendlyError } from '@/utils/errors';
import { DEFAULT_CENTER, toLatLng } from '@/utils/maps';
import { stopByType } from '@/utils/orders';

const TYPES: IncidentType[] = ['DELAY', 'DAMAGE', 'WRONG_ADDRESS', 'VEHICLE_PROBLEM', 'OTHER'];

export default function ReportIncidentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const order = useOrder(orderId);
  const location = useLatestLocation(orderId, true);
  const [type, setType] = useState<IncidentType>('DELAY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  const titleError = title.trim().length < 3 ? 'Resume el problema.' : null;
  const descriptionError = description.trim().length < 5 ? 'Cuéntanos qué pasó.' : null;

  const create = useMutation({
    mutationFn: () => {
      // La API exige coordenadas: la ultima del conductor o, si no, la entrega.
      const point =
        toLatLng(location.data) ??
        (order.data ? toLatLng(stopByType(order.data, 'DROPOFF')) : null) ??
        DEFAULT_CENTER;
      return incidentsApi.create({
        orderId,
        incidentType: type,
        severity: severityForIncident(type),
        title: title.trim().slice(0, 120),
        description: description.trim().slice(0, 1000),
        latitude: point.latitude,
        longitude: point.longitude,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incidents(orderId) });
      toast.success('Reporte enviado', 'Te responderemos en el detalle del envío.');
      router.back();
    },
  });

  return (
    <Screen edges={['bottom']}>
      <Muted>Operaciones verá tu reporte y te responderá en el detalle del envío.</Muted>
      <Card>
        <ChoiceChips<IncidentType>
          label="Tipo de problema"
          value={type}
          choices={TYPES.map((key) => ({ key, label: incidentTypeLabels[key] }))}
          onChange={setType}
        />
        <TextField label="Título" value={title} onChangeText={setTitle} maxLength={120} error={touched ? titleError : null} />
        <TextField
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          maxLength={1000}
          multiline
          error={touched ? descriptionError : null}
        />
      </Card>
      {create.error ? <ErrorBanner message={friendlyError(create.error)} /> : null}
      <Button
        label="Enviar reporte"
        icon="send"
        loading={create.isPending}
        onPress={() => {
          setTouched(true);
          if (!titleError && !descriptionError && orderId) create.mutate();
        }}
      />
    </Screen>
  );
}
