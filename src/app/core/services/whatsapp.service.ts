import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  // 01027997536 => +20 1027997536 => wa.me/201027997536
  private readonly phoneE164 = '201027997536';

  open(message?: string) {
    const base = `https://wa.me/${this.phoneE164}`;
    const url = message?.trim()
      ? `${base}?text=${encodeURIComponent(message.trim())}`
      : base;

    window.open(url, '_blank', 'noopener');
  }
}
