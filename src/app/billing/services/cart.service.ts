import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Course, CoursePricingPlan } from 'src/app/shared/models/course.model';

export interface CartItem {
  key: string;
  courseId: string;
  planId: string;
  title: string;
  description: string;
  price: number;
  priceText: string;
  thumbnail?: string;
  planName: string;
  planBadge?: string;
  planNote?: string;
  planFeatures: string[];
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly storageKey = 'nabdet-haya-cart';
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>(this.readFromStorage());

  readonly items$ = this.itemsSubject.asObservable();

  getItems(): CartItem[] {
    return this.itemsSubject.value;
  }

  getCount(): number {
    return this.itemsSubject.value.length;
  }

  getTotal(): number {
    return this.itemsSubject.value.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }

  hasItem(courseId: string, planId: string): boolean {
    return this.itemsSubject.value.some(
      (item) => item.courseId === courseId && item.planId === planId,
    );
  }

  addCourse(course: Course, plan: CoursePricingPlan): CartItem | null {
    if (!course?.id || !plan?.priceText?.trim()) return null;

    const planId = this.resolvePlanId(plan);
    const existingIndex = this.itemsSubject.value.findIndex(
      (item) => item.courseId === course.id && item.planId === planId,
    );

    const newItem: CartItem = {
      key: `${course.id}__${planId}`,
      courseId: course.id,
      planId,
      title: course.title || '',
      description: course.description || '',
      price: this.parsePrice(plan.priceText),
      priceText: plan.priceText || '',
      thumbnail: course.thumbnail || '',
      planName: plan.name || '',
      planBadge: plan.badge || '',
      planNote: plan.note || '',
      planFeatures: Array.isArray(plan.features) ? [...plan.features] : [],
    };

    const items = [...this.itemsSubject.value];

    if (existingIndex >= 0) {
      items[existingIndex] = newItem;
    } else {
      items.push(newItem);
    }

    this.updateState(items);
    return newItem;
  }

  removeItem(itemKey: string): void {
    const items = this.itemsSubject.value.filter((item) => item.key !== itemKey);
    this.updateState(items);
  }

  clear(): void {
    this.updateState([]);
  }

  private updateState(items: CartItem[]): void {
    this.itemsSubject.next(items);
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  private readFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private resolvePlanId(plan: CoursePricingPlan): string {
    const fromPlan = `${plan.id || ''}`.trim();
    if (fromPlan) return fromPlan;

    const fromName = `${plan.name || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return fromName || 'plan';
  }

  private parsePrice(value: string): number {
    const normalized = `${value || ''}`
      .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
      .replace(/[^0-9.,]/g, '')
      .replace(/,/g, '');

    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}