import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';

export interface StartPaymobCheckoutItem {
  itemType: 'course' | 'diploma';
  itemId: string;
  planId: string;
}

export interface StartPaymobCheckoutPayload {
  courseIds?: string[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  selectedItems?: StartPaymobCheckoutItem[];
  language?: 'ar' | 'en';
}

export interface StartPaymobCheckoutResponse {
  iframeUrl: string;
  merchantOrderId: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  async startCheckout(
    payload: StartPaymobCheckoutPayload
  ): Promise<StartPaymobCheckoutResponse> {
    const user = this.auth.currentUser;

    if (!user) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    const token = await user.getIdToken();

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return await firstValueFrom(
      this.http.post<StartPaymobCheckoutResponse>(
        '/api/paymob-create-session',
        payload,
        { headers }
      )
    );
  }
}
