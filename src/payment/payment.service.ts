import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PAYMENT_PROVIDERS } from './tokens';
import { PaymentProvider, PaymentResult } from './providers/payment-provider.interface';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_PROVIDERS)
    private readonly providers: PaymentProvider[],
  ) {}

  async initiate(
    method: PaymentMethod,
    order: {
      id: number;
      orderCode: string;
      totalAmount: number;
      customerEmail: string;
    },
  ): Promise<PaymentResult> {
    const provider = this.providers.find((p) => p.method === method);

    if (!provider) {
      throw new BadRequestException(
        `Metode pembayaran ${method} tidak didukung`,
      );
    }

    return provider.initiate(order);
  }
}