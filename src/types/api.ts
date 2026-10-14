/**
 * Contratos de la API (transport-api). Reflejan los DTO y el sobre
 * `{ success, data, meta }`. Los tipos de dominio vienen de app-customers, que
 * consume la misma API en produccion; los de dispositivos/notificaciones, de la
 * app de conductores.
 *
 * Ojo: los Decimal de Prisma llegan como string (`totalAmount`, `distanceKm`,
 * lat/lng de paradas, `amount`). Usar `toNumber` de `utils/format`.
 */

// ── Sobre de respuesta ───────────────────────────────────────────────────────
export interface ApiMeta {
  requestId?: string;
  timestamp: string;
  path?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta: ApiMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type ClientPlatform = 'ios' | 'android' | 'web';
export type Role = 'ADMIN' | 'OPERATOR' | 'DRIVER' | 'CUSTOMER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';
export type DocumentType = 'ID' | 'RNC' | 'PASSPORT';
export type ServiceType = 'INMEDIATE' | 'SCHEDULED';
export type StopType = 'PICKUP' | 'DROPOFF' | 'INTERMEDIATE';
export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_QUOTE'
  | 'PENDING_CUSTOMER_CONFIRMATION'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'ASSIGNING_DRIVER'
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';
export type PaymentMethod = 'CARD' | 'CASH' | 'TRANSFER' | 'WALLET' | 'CHECK' | 'CORPORATE_CREDIT';
export type PaymentProvider = 'cardnet' | 'azul' | 'internal-mock' | 'corporate-credit' | 'manual-check';
export type CreditAccountStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'REJECTED' | 'CLOSED';
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';
export type ReservationStatus = 'ACTIVE' | 'RESCHUDULED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
export type OrderCancellationType = 'CUSTOMER_CANCELLED' | 'DRIVER_CANCELLED' | 'ADMIN_CANCELLED' | 'SYSTEM_CANCELLED';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  status: AccountStatus;
  roles: Role[];
  permissions?: string[];
  sessionId?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
  status: AccountStatus;
  roles: Role[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthResult extends AuthTokens {
  user: UserProfile;
  sessionId: string;
}

export interface CustomerProfile {
  id: string;
  customerType: CustomerType;
  documentType: DocumentType;
  documentNumber: string;
  companyName: string | null;
  billingEmail: string | null;
  creditAccount: CustomerCreditAccount | null;
  createdAt: string;
}

export interface CustomerCreditAccount {
  id: string;
  creditLimit: number;
  balanceUsed: number;
  creditDays: number;
  status: CreditAccountStatus;
  approvedAt: string | null;
}

/** Pagina tal como la devuelve la API: `{ items, page, pageSize, totalItems, totalPages }`. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Un dispositivo con sesion abierta (GET /sessions/me). */
export interface SessionInfo {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  platform: string | null;
  ipAddress: string | null;
  lastActivityAt: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface CreditMovement {
  id: string;
  movementType: string;
  amount: number;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
  orderId: string | null;
  orderCode: string | null;
  paymentId: string | null;
  paymentMethod: string | null;
}

export type NotificationCategory = 'ORDER_UPDATE' | 'PAYMENT' | 'INCIDENT' | 'PROMOTION' | 'SYSTEM';

export interface NotificationPreference {
  category: NotificationCategory;
  push: boolean;
  email: boolean;
  /** Push obligatorio (ordenes, pagos, sistema). */
  locked: boolean;
}

export type EmailChangeResult =
  | { status: 'CODE_SENT'; sentTo: string; expiresAt: string }
  | { status: 'CHANGED'; email: string };

export interface CustomerAddress {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  province: string;
  countryCode: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface VehicleCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  maxWeightKg: string | number;
  maxVolumenM3: string | number;
  baseCapacityNote: string;
  isActive: boolean;
}

export interface OrderStopInput {
  stopType: StopType;
  sequence: number;
  contactName: string;
  contactPhone: string;
  addressLine: string;
  city: string;
  province: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
}

export interface OrderItemInput {
  description: string;
  quantity: number;
  weightKg: number;
  volumeM3?: number;
  declaredValue?: number;
  fragile?: boolean;
  requireHelper?: boolean;
}

export type AssignmentStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

/**
 * Asignacion de conductor y vehiculo a una orden.
 *
 * La API ya la incluye en `GET /orders` y `GET /orders/:id`; el cliente la
 * necesita para saber quien lleva su carga. `driver.user` llega con el select
 * seguro del backend, sin datos sensibles.
 */
export interface OrderAssignment {
  id: string;
  orderId: string;
  driverId: string;
  vehicleId: string;
  assignmentStatus: AssignmentStatus;
  assignedAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  driver?: {
    id: string;
    user?: { id: string; fullName: string; phone: string | null };
  };
  vehicle?: {
    id: string;
    plateNumber: string;
    brand: string;
    model: string;
    color: string;
  };
}

export interface TransportOrder {
  id: string;
  orderCode: string;
  customerId: string;
  quoteId: string | null;
  vehicleCategoryId: string;
  serviceType: ServiceType;
  status: OrderStatus;
  scheduleAt: string | null;
  pickupAt: string | null;
  deliveredAt: string | null;
  distanceKm: string | number | null;
  estimatedDurationMin: number | null;
  totalAmount: string | number | null;
  paymentStatus: PaymentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  orderStops?: OrderStop[];
  orderItems?: OrderItem[];
  orderAssignments?: OrderAssignment[];
  orderEvents?: OrderEvent[];
  reservations?: Reservation[];
  payments?: Payment[];
}

export interface PriceQuote {
  id: string;
  customerId: string;
  orderId: string | null;
  vehicleCategoryId: string;
  originAddress: string;
  destinationAddress: string;
  distanceKm: string | number;
  estimatedDurationMin: number;
  totalAmount: string | number;
  expiresAt: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  orderId: string;
  reservedFor: string;
  reservationStatus: ReservationStatus;
  rescheduleCount: number;
  cancellationDeadline: string;
  createdAt: string;
  order?: TransportOrder;
}

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: string | number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentProvider: string | null;
  status: PaymentStatus;
  checkStatus?: string | null;
  providerReference: string | null;
  transactionId?: string | null;
  responseCode?: string | null;
  remoteResponseCode?: string | null;
  authorizationCode?: string | null;
  retrievalReferenceNumber?: string | null;
  transactionToken?: string | null;
  maskedCardNumber?: string | null;
  verifiedAt?: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreatePaymentResult {
  payment: Payment;
  transaction: unknown;
  provider: PaymentProvider;
  providerReference?: string;
  checkoutUrl?: string;
}

export interface CreateCardnetSessionResult {
  paymentId: string;
  orderId: string;
  session: string;
  authorizeUrl: string;
  expiresAt: string;
}

export interface PaymentReceipt {
  paymentId: string;
  orderId: string;
  orderCode?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string | null;
  providerReference: string | null;
  transactionId: string | null;
  responseCode: string | null;
  remoteResponseCode: string | null;
  authorizationCode: string | null;
  retrievalReferenceNumber: string | null;
  transactionToken: string | null;
  maskedCardNumber: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface RouteEstimate {
  originAddress: string;
  destinationAddress: string;
  /** El numero con el que se cotiza. `distanceSource` dice cual se aplico. */
  distanceKm: number;
  estimatedDurationMin: number;
  /** Siempre presente: distancia en linea recta entre las dos paradas. */
  straightLineDistanceKm?: number;
  /** Nulo cuando no se pudo consultar Google Routes. */
  roadDistanceKm?: number | null;
  roadDurationMin?: number | null;
  /** Polilinea codificada de la ruta real, para dibujarla en el mapa. */
  polyline?: string | null;
  bounds?: { northeast: LatLng; southwest: LatLng } | null;
  provider: 'google-routes' | 'internal-mock';
  distanceSource?: 'road' | 'straight-line';
  computedAt?: string;
}

/**
 * Tramo desde donde esta el conductor hasta la parada a la que va.
 *
 * Deja ver cuanto le falta para llegar a recoger. Todo es anulable: mientras el
 * conductor no encienda el GPS no hay tramo que dibujar, y eso es lo normal al
 * principio.
 */
export interface OrderApproachRoute {
  route: ComputedRoute | null;
  targetStopId: string | null;
  targetStopType: StopType | null;
  origin: LatLng | null;
  originRecordedAt: string | null;
}

export interface ComputedRoute {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMin: number;
  polyline: string;
  legs: { distanceMeters: number; durationSeconds: number }[];
  bounds: { northeast: LatLng; southwest: LatLng } | null;
  provider: 'google-routes' | 'internal-mock';
  computedAt: string;
}

/**
 * Lo que cuesta cada categoria para una ruta y una carga concretas.
 *
 * Sale de `POST /pricing/quote-options`, que no persiste nada: la cotizacion
 * real se crea una sola vez, al enviar la orden.
 */
export interface QuoteOption {
  vehicleCategoryId: string;
  code: string;
  name: string;
  baseCapacityNote: string;
  maxWeightKg: number;
  maxVolumenM3: number;
  /** Nulo cuando la categoria no tiene tarifa vigente. */
  totalAmount: number | null;
  /** Si la carga declarada cabe en esta categoria. */
  fits: boolean;
  unavailable?: 'NO_RATE' | 'CAPACITY';
}

export interface PlaceSuggestion {
  placeId: string;
  text: string;
  mainText?: string;
  secondaryText?: string;
  types: string[];
}

export interface PlaceAutocompleteResult {
  suggestions: PlaceSuggestion[];
  provider: 'google-places' | 'internal-mock';
}

export interface PlaceDetailsResult {
  placeId: string;
  name: string | null;
  formattedAddress: string | null;
  location: LatLng | null;
  types: string[];
  googleMapsUri?: string;
  components?: GeocodeAddressComponents;
  provider: 'google-places' | 'internal-mock';
}

/**
 * La direccion ya partida por el backend.
 *
 * Opcional a proposito: permite desplegar el cliente antes que la API. Cuando
 * falta, `matchCatalogName` sigue siendo el respaldo.
 */
export interface GeocodeAddressComponents {
  streetNumber?: string | null;
  route?: string | null;
  /** Calle y numero ya compuestos: "Av. Sarasota #42". */
  street?: string | null;
  sector?: string | null;
  municipality?: string | null;
  province?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
}

export interface GeocodeResult {
  formattedAddress: string;
  location: LatLng;
  placeId?: string;
  types: string[];
  components?: GeocodeAddressComponents;
  provider: 'google-geocoding' | 'internal-mock';
}

export interface AddressValidationResult {
  formattedAddress: string | null;
  addressComplete: boolean;
  verdict: Record<string, unknown>;
  provider: 'google-address-validation' | 'internal-mock';
}

export interface DriverLocation {
  id: string;
  driverId: string;
  orderId: string;
  sessionId: string | null;
  vehicleId: string | null;
  latitude: string | number;
  longitude: string | number;
  accuracy: string | number | null;
  speed: string | number | null;
  batteryLevel: number | null;
  recordedAt: string;
  receivedAt: string;
}

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

export interface UploadedAttachment {
  file: {
    fieldName?: string;
    key: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  attachment: Attachment | null;
}

/* ---------------------------------------------------------------- Incidencias */

export type IncidentType =
  | 'DELAY'
  | 'DAMAGE'
  | 'CUSTOMER_ABSENT'
  | 'WRONG_ADDRESS'
  | 'VEHICLE_PROBLEM'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

export interface IncidentComment {
  id: string;
  incidentId: string;
  userId: string;
  comment: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  orderId: string;
  reportedBy: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  status: IncidentStatus;
  latitude: number | string;
  longitude: number | string;
  reportedAt: string;
  resolvedAt?: string | null;
  /** `GET /incidents` incluye los comentarios de cada incidencia. */
  incidentsComments?: IncidentComment[];
}

/* ------------------------------------------------------- Pruebas de entrega */

export type ProofType = 'PHOTO' | 'SIGNATURE' | 'QR' | 'CODE' | 'MIXED';
export type ValidationStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';

export interface Signature {
  id: string;
  proofId: string;
  signatureUrl: string;
  signerName: string;
  signedAt: string;
}

export interface DeliveryProof {
  id: string;
  orderId: string;
  proofType: ProofType;
  recipientName: string;
  recipientDocument: string;
  notes?: string | null;
  capturedAt: string;
  validationStatus: ValidationStatus;
  /** `GET /delivery-proofs` incluye las firmas de cada prueba. */
  signatures?: Signature[];
}

export interface EvidenceBundleItem {
  proof: DeliveryProof;
  attachments: Attachment[];
}

/* ------------------------------------------------------- Paradas y carga */

export interface OrderStop {
  id: string;
  orderId: string;
  stopType: StopType;
  sequence: number;
  contactName: string;
  contactPhone: string;
  addressLine: string;
  city: string;
  province: string;
  latitude: number | string | null;
  longitude: number | string | null;
  instructions?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  weightKg: number | string;
  volumeM3?: number | string | null;
  declaredValue?: number | string | null;
  fragile: boolean;
  requireHelper: boolean;
}

export type OrderEventType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'INCIDENT_REPORTED';

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType: OrderEventType | string;
  description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  createdAt: string;
}

export interface CancellationFee {
  feeApplied: boolean;
  feeAmount: number;
  refundAmount: number;
}

/* ------------------------------------------------- Tiempo real (socket.io) */

export type MatchingState = 'SEARCHING' | 'OFFERING' | 'NO_DRIVERS';

export interface MatchingStatusEvent {
  orderId: string;
  state: MatchingState;
  attempt: number;
  etaSeconds?: number;
  expiresAt?: string;
  at: string;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  status: OrderStatus;
  previousStatus?: OrderStatus;
  changedByUserId?: string;
  changedAt: string;
}

/* --------------------------------------- Dispositivos y notificaciones */

export type DevicePlatform = 'ANDROID' | 'IOS' | 'WEB';

export interface RegisterDevicePayload {
  token: string;
  platform: DevicePlatform;
  installationId: string;
  deviceName?: string;
  appVersion?: string;
  locale?: string;
}

export interface DeviceToken {
  id: string;
  token: string;
  platform: DevicePlatform;
  isActive: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  data: Record<string, unknown> | null;
  status?: string;
  readAt?: string | null;
  createdAt: string;
}

/** Datos de navegacion seguros que trae un push en `data`. */
export interface NotificationRoute {
  type: string;
  screen?: string;
  orderId?: string;
}

/** Principal de GET /auth/me. */
export type Me = AuthenticatedUser;
