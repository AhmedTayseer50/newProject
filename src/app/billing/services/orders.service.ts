import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PaymentResultResponse {
  ok: boolean;
  merchantOrderId: string;
  status: 'pending' | 'paid' | 'failed';
  amount: number;
  courseIds: string[];
  transactionId?: string | null;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private http = inject(HttpClient);

  getPaymentResult(merchantOrderId: string): Promise<PaymentResultResponse> {
    return this.http
      .get<PaymentResultResponse>(
        `/api/paymob-order-status?merchantOrderId=${encodeURIComponent(
          merchantOrderId,
        )}`,
      )
      .toPromise() as Promise<PaymentResultResponse>;
  }
}