import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  PaymentsService,
  StartPaymobCheckoutItem,
} from '../services/payments.service';
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
  private sanitizer = inject(DomSanitizer);

  courseId = '';
  items: CartItem[] = [];

  customerName = '';
  customerEmail = '';
  customerPhone = '';

  loading = true;
  submitting = false;
  error = '';
  paymentIframeUrl: SafeResourceUrl | null = null;
  paymentIframeRawUrl = '';
  merchantOrderId = '';
  paymentFrameLoading = false;

  get currentLang(): 'ar' | 'en' {
    return window.location.pathname.startsWith('/en') ? 'en' : 'ar';
  }

  get isEnglish(): boolean {
    return this.currentLang === 'en';
  }

  get totalPrice(): number {
    return this.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }

  get hasPaymentFrame(): boolean {
    return !!this.paymentIframeUrl;
  }

  get pageTitle(): string {
    return this.isEnglish ? 'Checkout' : 'إتمام الشراء';
  }

  get pageSubtitle(): string {
    return this.isEnglish
      ? 'Review your order, confirm your details, then complete card payment securely through Paymob without leaving the page.'
      : 'راجع طلبك، أكّد بياناتك، ثم أكمل دفع البطاقة بشكل آمن عبر Paymob بدون مغادرة الصفحة.';
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

  get itemsLabel(): string {
    return this.isEnglish ? 'Selected items' : 'العناصر المختارة';
  }

  get customerCardTitle(): string {
    return this.isEnglish ? 'Billing details' : 'بيانات الفاتورة';
  }

  get customerCardSubtitle(): string {
    return this.isEnglish
      ? 'Use the same details you want linked to your order and access activation.'
      : 'استخدم نفس البيانات التي تريد ربطها بطلبك وتفعيل الوصول بها.';
  }

  get paymentSectionTitle(): string {
    return this.isEnglish ? 'Card payment' : 'الدفع بالبطاقة';
  }

  get paymentSectionSubtitle(): string {
    return this.isEnglish
      ? 'Enter your Visa or bank card details inside the secure Paymob payment frame.'
      : 'أدخل بيانات الفيزا أو البطاقة البنكية داخل نافذة الدفع الآمنة الخاصة بـ Paymob.';
  }

  get paymentButtonText(): string {
    if (this.submitting) {
      return this.isEnglish
        ? 'Preparing payment form...'
        : 'جارٍ تجهيز نموذج الدفع...';
    }

    if (this.hasPaymentFrame) {
      return this.isEnglish ? 'Reload payment form' : 'إعادة تحميل نموذج الدفع';
    }

    return this.isEnglish
      ? 'Continue to card payment'
      : 'المتابعة إلى دفع البطاقة';
  }

  get securePaymentLabel(): string {
    return this.isEnglish ? 'Secure payment' : 'دفع آمن';
  }

  get trustedGatewayLabel(): string {
    return this.isEnglish ? 'Paymob gateway' : 'بوابة Paymob';
  }

  get instantActivationLabel(): string {
    return this.isEnglish ? 'Order tracking' : 'تتبع الطلب';
  }

  get supportedCardsLabel(): string {
    return this.isEnglish ? 'Accepted cards' : 'البطاقات المقبولة';
  }

  get secureListTitle(): string {
    return this.isEnglish ? 'Why this step is trusted' : 'لماذا هذه الخطوة موثوقة';
  }

  get paymentFrameHint(): string {
    return this.isEnglish
      ? 'Once the secure form appears, complete the card details there. The card data is not stored inside this website.'
      : 'بمجرد ظهور النموذج الآمن، أكمل بيانات البطاقة هناك. بيانات البطاقة لا يتم تخزينها داخل هذا الموقع.';
  }

  get paymentFrameLoadingText(): string {
    return this.isEnglish
      ? 'Preparing the secure payment form...'
      : 'جارٍ تجهيز نموذج الدفع الآمن...';
  }

  get paymentReadyTitle(): string {
    return this.isEnglish ? 'The secure form is ready' : 'النموذج الآمن جاهز';
  }

  get paymentReadyText(): string {
    return this.isEnglish
      ? 'Complete the payment inside the frame below. If the frame does not work properly, open it in a separate tab.'
      : 'أكمل عملية الدفع داخل النافذة بالأسفل. إذا لم تعمل النافذة بالشكل الصحيح، افتحها في تبويب منفصل.';
  }

  get openNewTabText(): string {
    return this.isEnglish ? 'Open in new tab' : 'فتح في تبويب جديد';
  }

  get viewResultText(): string {
    return this.isEnglish ? 'Check payment result' : 'مراجعة نتيجة الدفع';
  }

  get orderReferenceLabel(): string {
    return this.isEnglish ? 'Order reference' : 'مرجع الطلب';
  }

  get frameTitle(): string {
    return this.isEnglish ? 'Secure Paymob card form' : 'نموذج بطاقة Paymob الآمن';
  }

  get checkoutSteps(): string[] {
    return this.isEnglish
      ? ['Review order', 'Confirm details', 'Enter card details securely']
      : ['مراجعة الطلب', 'تأكيد البيانات', 'إدخال بيانات البطاقة بأمان'];
  }

  get trustBullets(): string[] {
    return this.isEnglish
      ? [
          'Card data is entered inside Paymob secure infrastructure.',
          'The same email and phone shown here are linked to your order.',
          'You can verify activation immediately from the payment result page.',
        ]
      : [
          'بيانات البطاقة يتم إدخالها داخل البنية الآمنة الخاصة بـ Paymob.',
          'نفس البريد والهاتف الظاهرين هنا يتم ربطهما بطلبك.',
          'يمكنك التحقق من التفعيل مباشرة من صفحة نتيجة الدفع.',
        ];
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

  async payNow(): Promise<void> {
    this.error = '';
    this.paymentIframeUrl = null;
    this.paymentIframeRawUrl = '';
    this.merchantOrderId = '';

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
    this.paymentFrameLoading = true;

    try {
      const selectedItems: StartPaymobCheckoutItem[] = this.items.map((item) => ({
        itemType: item.itemType,
        itemId: item.itemId,
        planId: this.normalizeCheckoutPlanId(item.planId),
      }));

      const result = await this.paymentsService.startCheckout({
        customerName: this.customerName.trim(),
        customerEmail: this.customerEmail.trim(),
        customerPhone: this.customerPhone.trim(),
        selectedItems,
        language: this.currentLang,
      });

      this.paymentIframeRawUrl = result.iframeUrl;
      this.paymentIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        result.iframeUrl
      );
      this.merchantOrderId = result.merchantOrderId;

      setTimeout(() => {
        document
          .getElementById('payment-frame-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (e: any) {
      this.error =
        e?.error?.message ||
        e?.message ||
        (this.isEnglish
          ? 'Unable to start payment right now. Please try again.'
          : 'تعذر بدء عملية الدفع الآن، حاول مرة أخرى');
      this.paymentFrameLoading = false;
    } finally {
      this.submitting = false;
    }
  }

  onPaymentFrameLoad(): void {
    this.paymentFrameLoading = false;
  }

  openPaymentInNewTab(): void {
    if (!this.paymentIframeRawUrl) return;
    window.open(this.paymentIframeRawUrl, '_blank', 'noopener');
  }

  goToPaymentResult(): void {
    if (!this.merchantOrderId) return;

    this.router.navigate(['/payment-result'], {
      queryParams: { merchantOrderId: this.merchantOrderId },
    });
  }

  getItemTypeLabel(item: CartItem): string {
    if (item.itemType === 'diploma') {
      return this.isEnglish ? 'Diploma' : 'دبلومة';
    }

    return this.isEnglish ? 'Course' : 'كورس';
  }
}
