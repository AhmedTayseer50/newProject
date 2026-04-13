import { Inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';

export interface HttpErrorOptions {
  locale?: 'ar' | 'en';
  fallbackAr?: string;
  fallbackEn?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HttpErrorService {
  constructor(@Inject(DOCUMENT) private document: Document) {}

  resolve(error: unknown, options: HttpErrorOptions = {}): string {
    const locale = options.locale || this.detectLocale();
    const fallback =
      locale === 'en'
        ? options.fallbackEn || 'Something went wrong. Please try again.'
        : options.fallbackAr || 'حدث خطأ غير متوقع. حاول مرة أخرى.';

    if (!error) {
      return fallback;
    }

    if (typeof error === 'string') {
      const message = error.trim();
      return message || fallback;
    }

    if (error instanceof HttpErrorResponse) {
      return this.resolveHttpError(error, locale, fallback);
    }

    const maybeCode = this.extractCode(error);
    if (maybeCode) {
      return this.resolveCodeMessage(maybeCode, locale, fallback);
    }

    const maybeMessage = this.extractMessage(error);
    return maybeMessage || fallback;
  }

  private resolveHttpError(
    error: HttpErrorResponse,
    locale: 'ar' | 'en',
    fallback: string,
  ): string {
    const nestedMessage = this.extractMessage(error.error);
    if (nestedMessage) {
      return nestedMessage;
    }

    const code = this.extractCode(error.error) || this.extractCode(error);
    if (code) {
      return this.resolveCodeMessage(code, locale, fallback);
    }

    const statusMap: Record<number, { ar: string; en: string }> = {
      0: {
        ar: 'تعذر الاتصال بالخدمة. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.',
        en: 'Unable to reach the service. Check your internet connection and try again.',
      },
      400: {
        ar: 'الطلب غير صالح. راجع البيانات ثم حاول مرة أخرى.',
        en: 'The request is invalid. Review the data and try again.',
      },
      401: {
        ar: 'انتهت صلاحية الجلسة أو لا يوجد تصريح كافٍ.',
        en: 'Your session has expired or you are not authorized.',
      },
      403: {
        ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
        en: 'You do not have permission to perform this action.',
      },
      404: {
        ar: 'العنصر المطلوب غير موجود أو لم يعد متاحًا.',
        en: 'The requested item was not found or is no longer available.',
      },
      409: {
        ar: 'يوجد تعارض مع البيانات الحالية. حدّث الصفحة ثم حاول مجددًا.',
        en: 'A data conflict was detected. Refresh and try again.',
      },
      429: {
        ar: 'تم إرسال طلبات كثيرة في وقت قصير. انتظر قليلًا ثم أعد المحاولة.',
        en: 'Too many requests were sent in a short time. Please wait and try again.',
      },
      500: {
        ar: 'حدث خطأ داخلي في الخادم. حاول مرة أخرى بعد قليل.',
        en: 'An internal server error occurred. Please try again shortly.',
      },
    };

    return statusMap[error.status]?.[locale] || this.extractMessage(error) || fallback;
  }

  private resolveCodeMessage(
    code: string,
    locale: 'ar' | 'en',
    fallback: string,
  ): string {
    const normalized = code.trim().toLowerCase();
    const map: Record<string, { ar: string; en: string }> = {
      'auth/email-already-in-use': {
        ar: 'هذا البريد الإلكتروني مستخدم بالفعل.',
        en: 'This email address is already in use.',
      },
      'auth/invalid-email': {
        ar: 'صيغة البريد الإلكتروني غير صحيحة.',
        en: 'The email address format is invalid.',
      },
      'auth/invalid-login-credentials': {
        ar: 'بيانات تسجيل الدخول غير صحيحة.',
        en: 'The login credentials are invalid.',
      },
      'auth/user-not-found': {
        ar: 'لا يوجد حساب مطابق لهذا البريد الإلكتروني.',
        en: 'No account was found for this email address.',
      },
      'auth/wrong-password': {
        ar: 'كلمة المرور غير صحيحة.',
        en: 'The password is incorrect.',
      },
      'auth/network-request-failed': {
        ar: 'حدثت مشكلة في الاتصال بالشبكة. حاول مرة أخرى.',
        en: 'A network error occurred. Please try again.',
      },
      'auth/too-many-requests': {
        ar: 'تم تنفيذ محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.',
        en: 'Too many attempts were made. Please wait and try again.',
      },
      'permission_denied': {
        ar: 'ليس لديك صلاحية للوصول إلى هذه البيانات.',
        en: 'You do not have permission to access this data.',
      },
      'permission-denied': {
        ar: 'ليس لديك صلاحية للوصول إلى هذه البيانات.',
        en: 'You do not have permission to access this data.',
      },
      unavailable: {
        ar: 'الخدمة غير متاحة حاليًا. حاول مرة أخرى بعد قليل.',
        en: 'The service is currently unavailable. Please try again shortly.',
      },
    };

    return map[normalized]?.[locale] || fallback;
  }

  private extractCode(value: unknown): string {
    if (!value || typeof value !== 'object') {
      return '';
    }

    const code = (value as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
  }

  private extractMessage(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object') {
      const message = (value as { message?: unknown }).message;
      return typeof message === 'string' ? message.trim() : '';
    }

    return '';
  }

  private detectLocale(): 'ar' | 'en' {
    return this.document.location?.pathname?.startsWith('/en') ? 'en' : 'ar';
  }
}
