import type { DeliveryProof, EvidenceBundleItem } from '@/types/api';
import { request } from './client';
import { attachmentsApi } from './attachments.api';

/**
 * Evidencia de entrega de una orden.
 *
 * `GET /delivery-proofs` esta permitido al rol CUSTOMER, pero el portal de
 * clientes no lo consumia: el cliente no veia la foto ni la firma de su
 * propia entrega.
 */
export const deliveryProofsApi = {
  listForOrder(orderId: string) {
    return request<DeliveryProof[]>({ method: 'GET', url: '/delivery-proofs', params: { orderId } });
  },

  async bundle(orderId: string): Promise<EvidenceBundleItem[]> {
    const proofs = await deliveryProofsApi.listForOrder(orderId);
    const attachments = await Promise.all(
      proofs.map((proof) => attachmentsApi.list({ entityType: 'DeliveryProof', entityId: proof.id })),
    );

    return proofs.map((proof, index) => ({ proof, attachments: attachments[index] ?? [] }));
  },
};
