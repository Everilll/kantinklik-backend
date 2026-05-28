import { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface PaymentResult {
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  qrCodeUrl?: string; // untuk QRIS phase 2
}

export interface PaymentProvider {
  method: PaymentMethod;
  initiate(order: {
    id: number;
    orderCode: string;
    totalAmount: number;
    customerEmail: string;
  }): Promise<PaymentResult>;
}