import { create } from 'zustand';
import type { RouteEstimate, ServiceType } from '@/types/api';

/** Direccion ya resuelta: lo que pide una parada de la orden. */
export interface PickedLocation {
  addressLine: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  /** Texto completo de Google, para mostrar. */
  formatted?: string;
}

export type LocationTarget = 'pickup' | 'dropoff' | 'address';
export type ContactMode = 'SELF' | 'OTHER';
export type PaymentChoice = 'CARD' | 'CHECK' | 'CORPORATE_CREDIT';

export interface StopDraft {
  location: PickedLocation | null;
  contactMode: ContactMode;
  contactName: string;
  contactPhone: string;
  instructions: string;
}

export interface ItemDraft {
  description: string;
  quantity: string;
  weightKg: string;
  volumeM3: string;
  declaredValue: string;
  fragile: boolean;
  requireHelper: boolean;
}

interface RequestDraftState {
  pickup: StopDraft;
  dropoff: StopDraft;
  item: ItemDraft;
  serviceType: ServiceType;
  scheduleAt: Date | null;
  notes: string;
  route: RouteEstimate | null;
  vehicleCategoryId: string | null;
  payment: PaymentChoice;
  setStop: (target: 'pickup' | 'dropoff', patch: Partial<StopDraft>) => void;
  setItem: (patch: Partial<ItemDraft>) => void;
  set: (patch: Partial<Pick<RequestDraftState, 'serviceType' | 'scheduleAt' | 'notes' | 'route' | 'vehicleCategoryId' | 'payment'>>) => void;
  reset: () => void;
}

const emptyStop = (): StopDraft => ({
  location: null,
  contactMode: 'SELF',
  contactName: '',
  contactPhone: '',
  instructions: '',
});

const emptyItem = (): ItemDraft => ({
  description: '',
  quantity: '1',
  weightKg: '',
  volumeM3: '',
  declaredValue: '',
  fragile: false,
  requireHelper: false,
});

/** Borrador del envio que se arma entre las pantallas de solicitud. */
export const useRequestDraft = create<RequestDraftState>((set, get) => ({
  pickup: emptyStop(),
  dropoff: emptyStop(),
  item: emptyItem(),
  serviceType: 'INMEDIATE',
  scheduleAt: null,
  notes: '',
  route: null,
  vehicleCategoryId: null,
  payment: 'CARD',
  setStop(target, patch) {
    // Cambiar una direccion invalida la ruta (y con ella los precios).
    const routeStale = patch.location !== undefined;
    set({ [target]: { ...get()[target], ...patch }, ...(routeStale ? { route: null } : {}) } as Partial<RequestDraftState>);
  },
  setItem(patch) {
    set({ item: { ...get().item, ...patch } });
  },
  set(patch) {
    set(patch);
  },
  reset() {
    set({
      pickup: emptyStop(),
      dropoff: emptyStop(),
      item: emptyItem(),
      serviceType: 'INMEDIATE',
      scheduleAt: null,
      notes: '',
      route: null,
      vehicleCategoryId: null,
      payment: 'CARD',
    });
  },
}));

/**
 * Resultado del selector de direccion. La pantalla que abre el selector lee
 * aqui lo elegido (no se puede pasar un objeto por parametros de ruta).
 */
interface LocationPickState {
  picked: Partial<Record<LocationTarget, PickedLocation>>;
  put: (target: LocationTarget, location: PickedLocation) => void;
  take: (target: LocationTarget) => PickedLocation | undefined;
}

export const useLocationPick = create<LocationPickState>((set, get) => ({
  picked: {},
  put(target, location) {
    set({ picked: { ...get().picked, [target]: location } });
  },
  take(target) {
    const value = get().picked[target];
    if (value) set({ picked: { ...get().picked, [target]: undefined } });
    return value;
  },
}));
