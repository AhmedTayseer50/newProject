import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartItem, CartService } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit {
  private cartService = inject(CartService);
  private router = inject(Router);

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

  ngOnInit(): void {
    this.cartService.items$.subscribe((items) => {
      this.items = items;
    });
  }

  removeItem(courseId: string): void {
    this.cartService.removeItem(courseId);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  continueShopping(): void {
    this.router.navigate(['/courses']);
  }

  goToCheckout(): void {
    if (!this.items.length) return;

    // الخطوة الحالية فقط: نجهز الانتقال
    // الخطوة التالية هنحوّل checkout بالكامل ليقرأ من cart
    this.router.navigate(['/checkout', this.items[0].id], {
      queryParams: { fromCart: '1' },
    });
  }
}