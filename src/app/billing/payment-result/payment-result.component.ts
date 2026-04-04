import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '../services/cart.service';
import { OrdersService, PaymentResultResponse } from '../services/orders.service';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  styleUrls: ['./payment-result.component.css'],
})
export class PaymentResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ordersService = inject(OrdersService);
  private cartService = inject(CartService);

  loading = true;
  error = '';
  result: PaymentResultResponse | null = null;

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get missingReferenceText(): string {
    return this.isEnglish ? 'Missing payment reference.' : 'مرجع الدفع غير موجود.';
  }

  get loadErrorText(): string {
    return this.isEnglish
      ? 'Unable to load payment result.'
      : 'تعذر تحميل نتيجة الدفع.';
  }

  get referenceLabel(): string {
    return this.isEnglish ? 'Reference' : 'رقم المرجع';
  }

  get amountLabel(): string {
    return this.isEnglish ? 'Amount' : 'المبلغ';
  }

  get itemsCountLabel(): string {
    return this.isEnglish ? 'Items' : 'العناصر';
  }

  get purchasedItemsLabel(): string {
    return this.isEnglish ? 'Purchased items' : 'العناصر المشتراة';
  }

  get transactionIdLabel(): string {
    return this.isEnglish ? 'Transaction ID' : 'رقم العملية';
  }

  get goToMyCoursesText(): string {
    return this.isEnglish ? 'Go to my courses' : 'اذهب إلى كورساتي';
  }

  get backToCoursesText(): string {
    return this.isEnglish ? 'Back to courses' : 'العودة للكورسات';
  }

  get resultTitle(): string {
    if (!this.result) return '';

    if (this.result.status === 'paid') {
      return this.isEnglish ? 'Payment successful' : 'تم الدفع بنجاح';
    }

    if (this.result.status === 'pending') {
      return this.isEnglish ? 'Payment is pending' : 'الدفع ما زال قيد المراجعة';
    }

    return this.isEnglish ? 'Payment failed' : 'فشلت عملية الدفع';
  }

  get resultMessage(): string {
    if (!this.result) return '';

    if (this.result.message) return this.result.message;

    if (this.result.status === 'paid') {
      return this.isEnglish
        ? 'Your access has been activated successfully.'
        : 'تم تفعيل وصولك بنجاح.';
    }

    if (this.result.status === 'pending') {
      return this.isEnglish
        ? 'Please wait a little and refresh again.'
        : 'برجاء الانتظار قليلًا ثم إعادة المحاولة.';
    }

    return this.isEnglish
      ? 'Please try again or contact support.'
      : 'يرجى المحاولة مرة أخرى أو التواصل مع الدعم.';
  }

  async ngOnInit(): Promise<void> {
    const merchantOrderId =
      this.route.snapshot.queryParamMap.get('merchantOrderId') || '';

    if (!merchantOrderId) {
      this.error = this.missingReferenceText;
      this.loading = false;
      return;
    }

    try {
      this.result = await this.ordersService.getPaymentResult(merchantOrderId);

      if (this.result?.status === 'paid') {
        const purchasedItems = Array.isArray(this.result.items) ? this.result.items : [];
        const hasDiplomaPurchase = purchasedItems.some((item) => item?.itemType === 'diploma');

        if (hasDiplomaPurchase) {
          this.cartService.clear();
        } else {
          this.cartService.removePurchasedItems(
            this.result.purchasedKeys || [],
            this.result.courseIds || []
          );

          if (!this.cartService.getItems().length) {
            this.cartService.clear();
          }
        }
      }
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || this.loadErrorText;
    } finally {
      this.loading = false;
    }
  }
}
