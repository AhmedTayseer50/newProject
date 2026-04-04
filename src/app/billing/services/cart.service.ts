import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Course, CoursePricingPlan } from 'src/app/shared/models/course.model';
import { Diploma, DiplomaPricingPlan } from 'src/app/shared/models/diploma.model';

export type CartItemType = 'course' | 'diploma';

export interface CartItem {
  key: string;
  itemType: CartItemType;
  itemId: string;
  courseId?: string;
  diplomaId?: string;
  title: string;
  description: string;
  price: number;
  priceText: string;
  thumbnail?: string;
  planId: string;
  planName: string;
  planBadge?: string;
  planNote?: string;
  planFeatures: string[];
  includedCourseIds?: string[];
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

  hasItem(itemId: string, planId: string, itemType: CartItemType = 'course'): boolean {
    const normalizedPlanId = `${planId || ''}`.trim();
    return this.itemsSubject.value.some(
      (item) =>
        item.itemType === itemType &&
        item.itemId === itemId &&
        (!normalizedPlanId || item.planId === normalizedPlanId),
    );
  }

  addCourse(course: Course, plan: CoursePricingPlan): CartItem | null {
    if (!course?.id || !plan?.priceText?.trim()) return null;

    const planId = this.resolvePlanId(plan.id, plan.name);
    const newItem: CartItem = {
      key: this.buildKey('course', course.id, planId),
      itemType: 'course',
      itemId: course.id,
      courseId: course.id,
      title: course.title || '',
      description: course.description || '',
      price: this.parsePrice(plan.priceText),
      priceText: plan.priceText || '',
      thumbnail: course.thumbnail || '',
      planId,
      planName: plan.name || '',
      planBadge: plan.badge || '',
      planNote: plan.note || '',
      planFeatures: Array.isArray(plan.features) ? [...plan.features] : [],
      includedCourseIds: [course.id],
    };

    this.upsertItem(newItem);
    return newItem;
  }

  addDiploma(diploma: Diploma & { id: string }, plan: DiplomaPricingPlan): CartItem | null {
    if (!diploma?.id || !plan?.priceText?.trim()) return null;

    const includedCourseIds = Object.keys(diploma.courseIds || {}).filter(Boolean);
    const planId = this.resolvePlanId(plan.id, plan.name);
    const newItem: CartItem = {
      key: this.buildKey('diploma', diploma.id, planId),
      itemType: 'diploma',
      itemId: diploma.id,
      diplomaId: diploma.id,
      title: diploma.title || '',
      description: diploma.description || '',
      price: this.parsePrice(plan.priceText),
      priceText: plan.priceText || '',
      thumbnail: diploma.thumbnail || '',
      planId,
      planName: plan.name || '',
      planBadge: plan.badge || '',
      planNote: plan.note || '',
      planFeatures: Array.isArray(plan.features) ? [...plan.features] : [],
      includedCourseIds,
    };

    this.upsertItem(newItem);
    return newItem;
  }

  removeItem(itemKey: string): void {
    const items = this.itemsSubject.value.filter((item) => item.key !== itemKey);
    this.updateState(items);
  }

  clear(): void {
    this.updateState([]);
  }

  removePurchasedItems(purchasedKeys: string[], grantedCourseIds: string[] = []): void {
    const keysSet = new Set((purchasedKeys || []).map((key) => `${key || ''}`.trim()).filter(Boolean));
    const courseIdsSet = new Set((grantedCourseIds || []).map((id) => `${id || ''}`.trim()).filter(Boolean));

    if (!keysSet.size && !courseIdsSet.size) {
      return;
    }

    const items = this.itemsSubject.value.filter((item) => {
      if (keysSet.has(item.key)) {
        return false;
      }

      if (item.itemType === 'course' && courseIdsSet.has(`${item.courseId || ''}`.trim())) {
        return false;
      }

      return true;
    });

    this.updateState(items);
  }

  removePurchasedCourses(courseIds: string[]): void {
    this.removePurchasedItems([], courseIds);
  }

  private upsertItem(newItem: CartItem): void {
    const items = [...this.itemsSubject.value];
    const existingIndex = items.findIndex(
      (item) => item.itemType === newItem.itemType && item.itemId === newItem.itemId,
    );

    if (existingIndex >= 0) {
      items[existingIndex] = newItem;
    } else {
      items.push(newItem);
    }

    this.updateState(items);
  }

  private buildKey(itemType: CartItemType, itemId: string, planId: string): string {
    return `${itemType}:${itemId}__${planId}`;
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

  private resolvePlanId(id?: string, fallbackName?: string): string {
    const fromId = `${id || ''}`.trim();
    if (fromId) {
      return this.slugify(fromId);
    }

    return this.slugify(`${fallbackName || ''}`) || 'plan';
  }

  private slugify(value: string): string {
    return `${value || ''}`
      .trim()
      .toLowerCase()
      .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
      .replace(/[^\u0621-\u064Aa-z0-9-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
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
