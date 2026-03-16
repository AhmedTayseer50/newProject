import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrdersService, PaymentResultResponse } from '../services/orders.service';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  styleUrls: ['./payment-result.component.css'],
})
export class PaymentResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ordersService = inject(OrdersService);

  loading = true;
  error = '';
  result: PaymentResultResponse | null = null;

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  async ngOnInit(): Promise<void> {
    const merchantOrderId =
      this.route.snapshot.queryParamMap.get('merchantOrderId') || '';

    if (!merchantOrderId) {
      this.error = this.isEnglish
        ? 'Missing payment reference.'
        : 'مرجع الدفع غير موجود.';
      this.loading = false;
      return;
    }

    try {
      this.result = await this.ordersService.getPaymentResult(merchantOrderId);
    } catch (e: any) {
      this.error =
        e?.error?.message ||
        e?.message ||
        (this.isEnglish
          ? 'Unable to load payment result.'
          : 'تعذر تحميل نتيجة الدفع.');
    } finally {
      this.loading = false;
    }
  }
}