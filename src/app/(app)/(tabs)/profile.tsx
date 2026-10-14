import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ActionSheet, ConfirmSheet } from '@/components/Sheet';
import { Avatar, Badge, Card, ListRow, Muted, SectionHeader } from '@/components/ui';
import { env } from '@/config/env';
import { customerTypeLabels, documentTypeLabels } from '@/features/profile/FiscalFields';
import { useAvatarPicker } from '@/features/profile/useAvatarPicker';
import { useCustomerMe } from '@/hooks/queries';
import { useAuth } from '@/store/auth.store';
import { makeStyles, themeModeLabels, useThemeMode, type ThemeMode } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import { formatMoney } from '@/utils/format';

export default function ProfileScreen() {
  const styles = useStyles();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const customer = useCustomerMe();
  const mode = useThemeMode((s) => s.mode);
  const setMode = useThemeMode((s) => s.setMode);
  const { pickAvatar, busy } = useAvatarPicker();
  const [themeOpen, setThemeOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const c = customer.data;
  const credit = c?.creditAccount;

  return (
    <Screen edges={['top']} refreshing={customer.isRefetching} onRefresh={() => void customer.refetch()}>
      <View style={styles.header}>
        <Avatar name={user?.fullName} uri={user?.avatarUrl} size={72} editable onPress={busy ? undefined : () => void pickAvatar()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.fullName}
          </Text>
          <Muted>{user?.email}</Muted>
          {c ? (
            <Badge
              label={c.customerType === 'BUSINESS' ? c.companyName ?? customerTypeLabels.BUSINESS : customerTypeLabels.INDIVIDUAL}
              tone="primary"
              icon={c.customerType === 'BUSINESS' ? 'business-outline' : 'person-outline'}
            />
          ) : null}
        </View>
      </View>

      <SectionHeader title="Cuenta" />
      <Card style={styles.group}>
        <ListRow icon="person-outline" title="Datos personales" subtitle={user?.phone || 'Agrega tu teléfono'} onPress={() => router.push('/profile/edit')} />
        <ListRow icon="location-outline" title="Mis direcciones" onPress={() => router.push('/profile/addresses')} />
        <ListRow icon="notifications-outline" title="Notificaciones" onPress={() => router.push('/notifications')} />
      </Card>

      <SectionHeader title="Facturación y pagos" />
      <Card style={styles.group}>
        <ListRow
          icon="receipt-outline"
          title="Datos fiscales"
          subtitle={c ? `${documentTypeLabels[c.documentType]} ${c.documentNumber}` : undefined}
          onPress={() => router.push('/profile/billing')}
        />
        <ListRow icon="wallet-outline" title="Pagos" onPress={() => router.push('/payments')} />
        {c?.customerType === 'BUSINESS' ? (
          <ListRow
            icon="business-outline"
            title="Crédito corporativo"
            subtitle={
              credit
                ? credit.status === 'ACTIVE'
                  ? `Disponible ${formatMoney(credit.creditLimit - credit.balanceUsed)}`
                  : `Estado: ${credit.status === 'PENDING' ? 'en revisión' : credit.status.toLowerCase()}`
                : 'Solicita una línea de crédito'
            }
            onPress={() => router.push('/profile/credit')}
          />
        ) : null}
      </Card>

      <SectionHeader title="Seguridad y app" />
      <Card style={styles.group}>
        <ListRow icon="mail-outline" title="Cambiar correo" onPress={() => router.push('/profile/email')} />
        <ListRow icon="key-outline" title="Cambiar contraseña" onPress={() => router.push('/profile/password')} />
        <ListRow icon="phone-portrait-outline" title="Sesiones abiertas" onPress={() => router.push('/profile/sessions')} />
        <ListRow icon="options-outline" title="Preferencias de avisos" onPress={() => router.push('/profile/notifications')} />
        <ListRow icon="contrast-outline" title="Apariencia" subtitle={themeModeLabels[mode]} onPress={() => setThemeOpen(true)} />
      </Card>

      <Card style={styles.group}>
        <ListRow icon="log-out-outline" title="Cerrar sesión" tone="danger" onPress={() => setLogoutOpen(true)} />
      </Card>
      <Muted style={styles.version}>La Ruta RD · versión {env.appVersion}</Muted>

      <ActionSheet
        visible={themeOpen}
        onClose={() => setThemeOpen(false)}
        title="Apariencia"
        options={(['system', 'light', 'dark'] as ThemeMode[]).map((key) => ({
          key,
          label: themeModeLabels[key],
          icon: key === 'system' ? 'phone-portrait-outline' : key === 'light' ? 'sunny-outline' : 'moon-outline',
        }))}
        onSelect={(key) => setMode(key as ThemeMode)}
      />
      <ConfirmSheet
        visible={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => void logout()}
        title="¿Cerrar sesión?"
        message="Dejarás de recibir avisos de tus envíos en este teléfono."
        confirmLabel="Cerrar sesión"
        danger
        icon="log-out-outline"
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    name: { fontSize: 20, fontWeight: '700', color: colors.text },
    group: { padding: 0, gap: 0, overflow: 'hidden' },
    version: { textAlign: 'center' },
  }),
);
