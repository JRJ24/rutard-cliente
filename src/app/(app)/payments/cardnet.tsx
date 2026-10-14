import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { paymentsApi } from '@/api/payments.api';
import { queryClient } from '@/api/query';
import { Screen } from '@/components/Screen';
import { Button, EmptyState, Muted } from '@/components/ui';
import { toast } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/theme';
import { friendlyError } from '@/utils/errors';

/** Pagina que auto-envia el POST con `SESSION`, igual que el portal web. */
function autoSubmitHtml(authorizeUrl: string, session: string): string {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#57534E">
<form id="f" method="POST" action="${esc(authorizeUrl)}"><input type="hidden" name="SESSION" value="${esc(session)}"></form>
<p>Abriendo pago seguro…</p>
<script>document.getElementById('f').submit();</script>
</body></html>`;
}

/** Lee `?a=b&c=d` sin depender del `URL` de React Native. */
function queryParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const q = url.split('?')[1]?.split('#')[0] ?? '';
  for (const pair of q.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      out[k] = v;
    }
  }
  return out;
}

/**
 * CardNET en un WebView. La API recibe la respuesta de CardNET, verifica el
 * pago y redirige a `<CUSTOMER_APP_BASE_URL>/pagos/cardnet/resultado|cancelado`;
 * aqui se intercepta esa redireccion (no se carga el portal web) y se confirma
 * el pago con `POST /payments/:id/verify`.
 */
export default function CardnetScreen() {
  const { colors } = useTheme();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [webError, setWebError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const done = useRef(false);

  // La API reutiliza una sesion abierta y da 409 si ya esta pagada.
  const session = useQuery({
    queryKey: ['payments', 'cardnet-session', orderId],
    queryFn: () => paymentsApi.createCardnetSession(orderId),
    enabled: Boolean(orderId),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  const checkout = session.data ?? null;
  const error = webError ?? (session.error ? friendlyError(session.error, 'No pudimos abrir el pago con tarjeta.') : null);
  const start = () => {
    setWebError(null);
    void session.refetch();
  };

  const finish = useCallback(
    async (url: string) => {
      if (done.current || !checkout) return;
      done.current = true;
      setFinishing(true);
      const params = queryParams(url);
      const cancelled = url.includes('/pagos/cardnet/cancelado');
      const paymentId = params.paymentId || checkout.paymentId;
      try {
        const receipt = cancelled ? null : await paymentsApi.verify(paymentId).catch(() => null);
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        const status = receipt?.status ?? params.status;
        if (status === 'PAID' || status === 'AUTHORIZED') {
          toast.success('Pago aprobado', 'Estamos buscando un conductor para tu envío.');
        } else if (cancelled || status === 'CANCELLED') {
          toast.warning('Pago cancelado', 'Puedes pagar más tarde desde Pagos.');
        } else {
          toast.error('El pago no se completó', 'Revisa el comprobante o intenta otra vez.');
        }
        router.replace({ pathname: '/payments/receipt', params: { paymentId } });
      } finally {
        setFinishing(false);
      }
    },
    [checkout],
  );

  const intercept = (event: WebViewNavigation | { url: string }) => {
    if (event.url.includes('/pagos/cardnet/')) {
      void finish(event.url);
      return false;
    }
    return true;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button
              label="Cerrar"
              variant="ghost"
              size="md"
              onPress={() => {
                toast.info('Pago pendiente', 'Puedes completarlo desde Pagos.');
                router.back();
              }}
            />
          ),
        }}
      />
      {error ? (
        <Screen edges={['bottom']}>
          <EmptyState icon="card-outline" title="No se abrió el pago" message={error} />
          <Button label="Reintentar" icon="refresh" onPress={start} />
          <Button label="Pagar más tarde" variant="ghost" onPress={() => router.back()} />
        </Screen>
      ) : !checkout || finishing ? (
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <ActivityIndicator color={colors.primary} />
          <Muted>{finishing ? 'Confirmando tu pago…' : 'Preparando pago seguro…'}</Muted>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html: autoSubmitHtml(checkout.authorizeUrl, checkout.session), baseUrl: '' }}
          onShouldStartLoadWithRequest={intercept}
          onNavigationStateChange={(nav) => {
            if (nav.url.includes('/pagos/cardnet/')) intercept(nav);
          }}
          onError={() => setWebError('Se perdió la conexión con CardNET.')}
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.center, StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
          style={{ flex: 1 }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
