import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PaymentProvider, PaymentResult } from './payment-provider.interface';

@Injectable()
export class XenditQrisProvider implements PaymentProvider {
  method = PaymentMethod.ONLINE;

  async initiate(_order: {
    id: number;
    orderCode: string;
    totalAmount: number;
    customerEmail: string;
  }): Promise<PaymentResult> {
    throw new NotImplementedException(
      'Pembayaran QRIS belum tersedia. Gunakan Cash untuk saat ini.',
    );
  }
}