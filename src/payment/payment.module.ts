import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CashProvider } from './providers/cash.provider';
import { XenditQrisProvider } from './providers/xendit-qris.provider';
import { PAYMENT_PROVIDERS } from './tokens';

@Module({
  providers: [
    CashProvider,
    XenditQrisProvider,
    {
      provide: PAYMENT_PROVIDERS,
      useFactory: (cash: CashProvider, xendit: XenditQrisProvider) => [
        cash,
        xendit,
      ],
      inject: [CashProvider, XenditQrisProvider],
    },
    PaymentService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}