import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { CartItem, CartService } from '../services/cart.service';
import { PaymentsService, StartPaymobCheckoutItem } from '../services/payments.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private router = inject(Router);
  private paymentsService = inject(PaymentsService);
  private subscription?: Subscription;

  items: CartItem[] = [];
  submittingWhatsappOrder = false;
  checkoutError = '';

  get currentLang(): 'ar' | 'en' {
    return window.location.pathname.startsWith('/en') ? 'en' : 'ar';
  }

  get isEnglish(): boolean {
    return this.currentLang === 'en';
  }

  get totalPrice(): number {
    return this.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }

  get itemsCountLabel(): string {
    if (this.isEnglish) {
      return this.items.length === 1 ? 'item' : 'items';
    }

    return this.items.length === 1 ? 'عنصر' : 'عناصر';
  }

  ngOnInit(): void {
    this.subscription = this.cartService.items$.subscribe((items) => {
      this.items = items;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  removeItem(itemKey: string): void {
    this.cartService.removeItem(itemKey);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  continueShopping(): void {
    const hasDiploma = this.items.some((item) => item.itemType === 'diploma');
    this.router.navigate([hasDiploma ? '/diplomas' : '/courses']);
  }

  viewItem(item: CartItem): void {
    if (!item.itemId) return;

    this.router.navigate([item.itemType === 'diploma' ? '/diplomas' : '/courses', item.itemId]);
  }

  private normalizeCheckoutPlanId(planId: string): string {
    const normalized = `${planId || ''}`
      .trim()
      .toLowerCase()
      .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
      .replace(/[^\u0621-\u064Aa-z0-9-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (/^\d+$/.test(normalized)) {
      return `plan-${normalized}`;
    }

    return normalized;
  }

  async goToCheckout(): Promise<void> {
    if (!this.items.length || this.submittingWhatsappOrder) {
      return;
    }

    this.checkoutError = '';
    this.submittingWhatsappOrder = true;

    try {
      const selectedItems: StartPaymobCheckoutItem[] = this.items.map((item) => ({
        itemType: item.itemType,
        itemId: item.itemId,
        planId: this.normalizeCheckoutPlanId(item.planId),
      }));

      const result = await this.paymentsService.startWhatsappOrder({
        selectedItems,
        language: this.currentLang,
      });

      this.cartService.clear();
      window.location.href = result.whatsappUrl;
    } catch (e: any) {
      this.checkoutError =
        e?.error?.message ||
        e?.message ||
        (this.isEnglish
          ? 'Unable to create the WhatsApp order right now. Please try again.'
          : 'تعذر إنشاء طلب الواتساب الآن، حاول مرة أخرى.');
    } finally {
      this.submittingWhatsappOrder = false;
    }
  }
}
