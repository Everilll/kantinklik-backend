import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import {
  PaymentProvider,
  PaymentResult,
} from './payment-provider.interface';

@Injectable()
export class CashProvider implements PaymentProvider {
  method = PaymentMethod.CASH;

  async initiate(_order: {
    id: number;
    orderCode: string;
    totalAmount: number;
    customerEmail: string;
  }): Promise<PaymentResult> {
    // Cash: tidak ada external call
    // Status tetap UNPAID sampai vendor complete order
    return {
      paymentStatus: 'UNPAID',
      paymentReference: null,
    };
  }
}