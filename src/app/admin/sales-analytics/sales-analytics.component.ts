import { Component, OnInit, inject } from '@angular/core';
import {
  SalesAnalyticsService,
  SalesAnalyticsSummaryRow,
  SalesOrderRecord,
} from '../services/sales-analytics.service';

@Component({
  selector: 'app-sales-analytics',
  templateUrl: './sales-analytics.component.html',
  styleUrls: ['./sales-analytics.component.css'],
})
export class SalesAnalyticsComponent implements OnInit {
  private salesAnalyticsService = inject(SalesAnalyticsService);

  loading = true;
  error = '';

  allOrders: SalesOrderRecord[] = [];
  filteredOrders: SalesOrderRecord[] = [];
  monthlySummary: SalesAnalyticsSummaryRow[] = [];
  dailySummary: SalesAnalyticsSummaryRow[] = [];

  searchTerm = '';
  statusFilter = 'all';
  monthFilter = 'all';

  totalRevenue = 0;
  paidOrdersCount = 0;
  todayRevenue = 0;
  todayOrdersCount = 0;
  currentMonthRevenue = 0;
  currentMonthOrdersCount = 0;

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      this.allOrders = await this.salesAnalyticsService.getAllOrders();
      this.monthlySummary = this.salesAnalyticsService.buildMonthlySummary(this.allOrders);
      this.dailySummary = this.salesAnalyticsService.buildDailySummary(this.allOrders);
      this.calculateTopStats();
      this.applyFilters();
    } catch (error: any) {
      this.error = error?.message || 'تعذر تحميل بيانات المبيعات.';
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredOrders = this.allOrders.filter((order) => {
      const statusMatches = this.statusFilter === 'all' || order.status === this.statusFilter;
      const monthMatches = this.monthFilter === 'all' || this.getOrderMonthKey(order) === this.monthFilter;

      const haystack = [
        order.merchantOrderId,
        order.userEmail,
        order.userName,
        order.userPhone,
        order.transactionId,
        ...order.items.map((item) => item.title),
      ]
        .join(' ')
        .toLowerCase();

      const termMatches = !term || haystack.includes(term);

      return statusMatches && monthMatches && termMatches;
    });
  }

  get availableMonths(): SalesAnalyticsSummaryRow[] {
    return this.monthlySummary;
  }

  get paidOrders(): SalesOrderRecord[] {
    return this.allOrders.filter((order) => order.status === 'paid');
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'paid':
        return 'مدفوع';
      case 'failed':
        return 'فشل';
      default:
        return 'قيد المعالجة';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid':
        return 'status-paid';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  }

  formatDate(value: number | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  }

  formatTime(value: number | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(value));
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  getOrderPrimaryTimestamp(order: SalesOrderRecord): number {
    return order.paidAt || order.failedAt || order.createdAt || 0;
  }

  printInvoice(order: SalesOrderRecord): void {
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) return;

    const invoiceHtml = this.buildInvoiceHtml(order);
    popup.document.open();
    popup.document.write(invoiceHtml);
    popup.document.close();
    popup.focus();
    popup.onload = () => {
      popup.print();
    };
  }

  trackByOrderId(_: number, order: SalesOrderRecord): string {
    return order.merchantOrderId;
  }

  private calculateTopStats(): void {
    const paidOrders = this.paidOrders;
    this.totalRevenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);
    this.paidOrdersCount = paidOrders.length;

    const now = new Date();
    const todayKey = this.getDateKey(now);
    const currentMonthKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;

    const todayOrders = paidOrders.filter(
      (order) => this.getDateKey(new Date(order.paidAt || order.createdAt || 0)) === todayKey
    );
    this.todayRevenue = todayOrders.reduce((sum, order) => sum + order.amount, 0);
    this.todayOrdersCount = todayOrders.length;

    const currentMonthOrders = paidOrders.filter(
      (order) => this.getOrderMonthKey(order) === currentMonthKey
    );
    this.currentMonthRevenue = currentMonthOrders.reduce((sum, order) => sum + order.amount, 0);
    this.currentMonthOrdersCount = currentMonthOrders.length;
  }

  private getOrderMonthKey(order: SalesOrderRecord): string {
    const date = new Date(this.getOrderPrimaryTimestamp(order));
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  }

  private buildInvoiceHtml(order: SalesOrderRecord): string {
    const rows = order.items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(item.title || '—')}</td>
            <td>${this.escapeHtml(item.planName || '—')}</td>
            <td>${this.formatCurrency(item.price)} ${this.escapeHtml(order.currency)}</td>
          </tr>
        `
      )
      .join('');

    const invoiceDate = this.formatDate(this.getOrderPrimaryTimestamp(order));
    const invoiceTime = this.formatTime(this.getOrderPrimaryTimestamp(order));

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>فاتورة - ${this.escapeHtml(order.merchantOrderId)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #222; background: #fff; }
    .invoice { max-width: 900px; margin: 0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:24px; }
    .brand h1 { margin:0 0 8px; font-size:28px; }
    .brand p { margin:0; color:#666; line-height:1.7; }
    .meta { text-align:left; }
    .meta p { margin:0 0 6px; }
    .section { margin-top:20px; border:1px solid #ddd; border-radius:12px; padding:16px; }
    .section h2 { margin:0 0 12px; font-size:18px; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:10px 16px; }
    .grid p { margin:0; line-height:1.8; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    th, td { border:1px solid #ddd; padding:10px; text-align:right; }
    th { background:#f5f5f5; }
    .total { margin-top:16px; display:flex; justify-content:space-between; font-size:20px; font-weight:700; }
    .status { display:inline-block; padding:6px 12px; border-radius:999px; background:#e7f7ec; color:#18794e; font-weight:700; }
    .footer { margin-top:28px; color:#666; line-height:1.8; font-size:14px; }
    @media print { body { padding: 0; } .invoice { max-width: none; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="brand">
        <h1>فاتورة شراء</h1>
        <p>منصة نبضة حياة</p>
        <p>مرجع الطلب: ${this.escapeHtml(order.merchantOrderId)}</p>
      </div>
      <div class="meta">
        <p><strong>التاريخ:</strong> ${invoiceDate}</p>
        <p><strong>الوقت:</strong> ${invoiceTime}</p>
        <p><strong>الحالة:</strong> <span class="status">${this.escapeHtml(this.getStatusLabel(order.status))}</span></p>
      </div>
    </div>

    <div class="section">
      <h2>بيانات العميل</h2>
      <div class="grid">
        <p><strong>الاسم:</strong> ${this.escapeHtml(order.userName || '—')}</p>
        <p><strong>البريد الإلكتروني:</strong> ${this.escapeHtml(order.userEmail || '—')}</p>
        <p><strong>رقم الهاتف:</strong> ${this.escapeHtml(order.userPhone || '—')}</p>
        <p><strong>معرّف المستخدم:</strong> ${this.escapeHtml(order.userId || '—')}</p>
        <p><strong>رقم المعاملة:</strong> ${this.escapeHtml(order.transactionId || '—')}</p>
        <p><strong>بوابة الدفع:</strong> ${this.escapeHtml(order.paymentProvider || '—')}</p>
      </div>
    </div>

    <div class="section">
      <h2>تفاصيل العملية</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>المنتج</th>
            <th>الخطة</th>
            <th>السعر</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4">لا توجد عناصر</td></tr>'}
        </tbody>
      </table>
      <div class="total">
        <span>الإجمالي</span>
        <span>${this.formatCurrency(order.amount)} ${this.escapeHtml(order.currency)}</span>
      </div>
    </div>

    <div class="footer">
      هذه الفاتورة تم توليدها من صفحة المبيعات والإحصائيات. يمكنك حفظها بصيغة PDF من نافذة الطباعة.
    </div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
