import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { PaymentsService, StartPaymobCheckoutItem } from '../services/payments.service';
import { UserService } from 'src/app/core/services/user.service';
import { CartItem, CartService } from '../services/cart.service';

@Component({
  selector: 'app-purchase-course',
  templateUrl: './purchase-course.component.html',
  styleUrls: ['./purchase-course.component.css'],
})
export class PurchaseCourseComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private paymentsService = inject(PaymentsService);
  private userService = inject(UserService);
  private cartService = inject(CartService);

  courseId = '';
  items: CartItem[] = [];

  customerName = '';
  customerEmail = '';
  customerPhone = '';

  loading = true;
  submitting = false;
  error = '';

  get currentLang(): 'ar' | 'en' {
    return window.location.pathname.startsWith('/en') ? 'en' : 'ar';
  }

  get isEnglish(): boolean {
    return this.currentLang === 'en';
  }

  get totalPrice(): number {
    return this.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }

  get pageTitle(): string {
    return this.isEnglish ? 'Checkout' : 'إتمام الشراء';
  }

  get summaryTitle(): string {
    return this.isEnglish ? 'Order summary' : 'ملخص الطلب';
  }

  get totalLabel(): string {
    return this.isEnglish ? 'Total' : 'الإجمالي';
  }

  get fullNameLabel(): string {
    return this.isEnglish ? 'Full name' : 'الاسم الكامل';
  }

  get emailLabel(): string {
    return this.isEnglish ? 'Email' : 'البريد الإلكتروني';
  }

  get phoneLabel(): string {
    return this.isEnglish ? 'WhatsApp / Phone' : 'رقم الواتساب / الهاتف';
  }

  get payButtonText(): string {
    if (this.submitting) {
      return this.isEnglish
        ? 'Redirecting to payment...'
        : 'جارٍ التحويل إلى الدفع...';
    }

    return this.isEnglish ? 'Pay with Paymob' : 'الدفع عبر Paymob';
  }

  async ngOnInit(): Promise<void> {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';

    try {
      const cartItems = this.cartService.getItems();

      if (cartItems.length) {
        this.items = cartItems;
      } else if (this.courseId) {
        this.router.navigate(['/courses', this.courseId]);
        return;
      } else {
        this.router.navigate(['/cart']);
        return;
      }

      const user = this.auth.currentUser;
      if (user?.uid) {
        const profile = await this.userService.getUserProfile(user.uid);
        this.customerName = profile?.displayName || user.displayName || '';
        this.customerEmail = profile?.email || user.email || '';
        this.customerPhone = profile?.whatsapp || '';
      }
    } catch (e: any) {
      this.error =
        e?.message ||
        (this.isEnglish
          ? 'An error occurred while loading checkout data'
          : 'حدث خطأ أثناء تحميل بيانات الشراء');
    } finally {
      this.loading = false;
    }
  }

  async payNow(): Promise<void> {
    this.error = '';

    if (!this.items.length) {
      this.error = this.isEnglish
        ? 'There are no items available for checkout'
        : 'لا توجد عناصر متاحة لإتمام الشراء';
      return;
    }

    if (!this.customerName.trim()) {
      this.error = this.isEnglish
        ? 'Please enter your full name'
        : 'من فضلك أدخل الاسم';
      return;
    }

    if (!this.customerEmail.trim()) {
      this.error = this.isEnglish
        ? 'Please enter your email address'
        : 'من فضلك أدخل البريد الإلكتروني';
      return;
    }

    if (!this.customerPhone.trim()) {
      this.error = this.isEnglish
        ? 'Please enter your WhatsApp number or phone'
        : 'من فضلك أدخل رقم الواتساب أو الهاتف';
      return;
    }

    this.submitting = true;

    try {
      const uniqueCourseIds = Array.from(new Set(this.items.map((item) => item.courseId).filter(Boolean)));

      const selectedItems: StartPaymobCheckoutItem[] = this.items.map((item) => ({
        courseId: item.courseId,
        planId: item.planId,
        planName: item.planName,
        price: item.price,
        priceText: item.priceText,
      }));

      const result = await this.paymentsService.startCheckout({
        courseIds: uniqueCourseIds,
        customerName: this.customerName.trim(),
        customerEmail: this.customerEmail.trim(),
        customerPhone: this.customerPhone.trim(),
        selectedItems,
      });

      window.location.href = result.iframeUrl;
    } catch (e: any) {
      this.error =
        e?.error?.message ||
        e?.message ||
        (this.isEnglish
          ? 'Unable to start payment right now. Please try again.'
          : 'تعذر بدء عملية الدفع الآن، حاول مرة أخرى');
    } finally {
      this.submitting = false;
    }
  }
}
