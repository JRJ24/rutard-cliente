import axios from 'axios';
import { ApiRequestError, toErrorMessage } from '@/api/client';
import type { ApiResponse } from '@/types/api';

export interface ApiFailure {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
}

export function readApiFailure(error: unknown): ApiFailure {
  if (error instanceof ApiRequestError) {
    return { code: error.code, message: error.message, details: error.details };
  }
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    const body = data && 'success' in data && !data.success ? data.error : undefined;
    return {
      status: error.response?.status,
      code: body?.code,
      message: body?.message ?? error.message,
      details: body?.details,
    };
  }
  return { message: toErrorMessage(error) };
}

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

/** Mensajes de la API (en ingles) que el cliente puede encontrarse. */
const MESSAGE_MAP: Array<[RegExp, string]> = [
  [/quote.*expired|expired.*quote/i, 'La cotización venció. Vuelve a cotizar el envío.'],
  [/exceeds|capacity|does not fit/i, 'La carga excede la capacidad del vehículo elegido.'],
  [/already paid/i, 'Esta orden ya está pagada.'],
  [/credit/i, 'Tu crédito corporativo no cubre este pago.'],
  [/invalid status transition|cannot transition/i, 'La orden cambió de estado. Actualiza e intenta de nuevo.'],
  [/current password/i, 'La contraseña actual no es correcta.'],
  [/document/i, 'Ese documento ya está registrado o no es válido.'],
  [/phone/i, 'Ese teléfono ya está en uso o no es válido.'],
  [/email/i, 'Ese correo ya está en uso o no es válido.'],
];

const CODE_MAP: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  AUTH_ACCOUNT_BLOCKED: 'Tu cuenta está bloqueada. Contacta a soporte.',
  AUTH_ACCOUNT_INACTIVE: 'Tu cuenta está inactiva. Contacta a soporte.',
  AUTH_SESSION_REVOKED: 'Tu sesión se cerró. Inicia sesión de nuevo.',
  AUTH_TOKEN_REUSE_DETECTED: 'Tu sesión se cerró por seguridad. Inicia sesión de nuevo.',
  MAPS_PROVIDER_UNAVAILABLE: 'El servicio de mapas no está disponible. Intenta de nuevo.',
  MAPS_PROVIDER_QUOTA_EXCEEDED: 'El servicio de mapas está saturado. Intenta en unos minutos.',
  ROUTE_NOT_FOUND: 'No encontramos una ruta entre esos dos puntos.',
  RATE_LIMITED: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
  RESOURCE_NOT_FOUND: 'No encontramos lo que buscabas. Actualiza la lista.',
  FORBIDDEN: 'No tienes permiso para esta acción.',
  UPSTREAM_TIMEOUT: 'El servicio de mapas tardó demasiado. Intenta de nuevo.',
  SERVICE_UNAVAILABLE: 'El servicio no está disponible ahora mismo.',
};

/** Mensaje claro en espanol para cualquier error de la API o de red. */
export function friendlyError(error: unknown, fallback = 'Algo salió mal. Intenta de nuevo.'): string {
  if (isNetworkError(error)) {
    return 'Sin conexión. Revisa tu señal e intenta de nuevo.';
  }
  const failure = readApiFailure(error);
  if (failure.code && CODE_MAP[failure.code]) {
    return CODE_MAP[failure.code];
  }
  for (const [pattern, text] of MESSAGE_MAP) {
    if (pattern.test(failure.message)) return text;
  }
  if (failure.code === 'RESOURCE_CONFLICT') return 'Ese dato ya está registrado en otra cuenta.';
  if (failure.status === 409) return 'Hubo un conflicto con el estado actual. Actualiza e intenta de nuevo.';
  if (failure.status && failure.status >= 500) return 'El servidor tuvo un problema. Intenta en unos segundos.';
  if (failure.status === 403) return 'No tienes permiso para esta acción.';
  // Mensajes ya en espanol (validaciones locales) pasan tal cual.
  if (/[áéíóúñ¿¡]/i.test(failure.message)) return failure.message;
  return fallback;
}

/** 404 de la API (p. ej. `GET /customers/me` sin perfil fiscal). */
export function isNotFound(error: unknown): boolean {
  const f = readApiFailure(error);
  return f.status === 404 || f.code === 'RESOURCE_NOT_FOUND';
}
