import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { CartItem, CartService } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private router = inject(Router);
  private subscription?: Subscription;

  items: CartItem[] = [];

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
      return this.items.length === 1 ? 'plan' : 'plans';
    }

    return this.items.length === 1 ? 'خطة' : 'خطط';
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
    this.router.navigate(['/courses']);
  }

  viewCourse(courseId: string): void {
    if (!courseId) return;
    this.router.navigate(['/courses', courseId]);
  }

  goToCheckout(): void {
    if (!this.items.length) {
      return;
    }

    this.router.navigate(['/checkout'], {
      queryParams: { fromCart: '1' },
    });
  }
}
