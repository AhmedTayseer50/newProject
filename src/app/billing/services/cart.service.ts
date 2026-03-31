import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Course } from 'src/app/shared/models/course.model';

export interface CartItem {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail?: string;
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

  hasItem(courseId: string): boolean {
    return this.itemsSubject.value.some((item) => item.id === courseId);
  }

  addCourse(course: Course): void {
    if (!course?.id) return;
    if (this.hasItem(course.id)) return;

    const items = [...this.itemsSubject.value];
    items.push({
      id: course.id,
      title: course.title || '',
      description: course.description || '',
      price: Number(course.price || 0),
      thumbnail: course.thumbnail || '',
    });

    this.updateState(items);
  }

  removeItem(courseId: string): void {
    const items = this.itemsSubject.value.filter((item) => item.id !== courseId);
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
}