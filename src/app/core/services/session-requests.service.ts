// src/app/core/services/session-requests.service.ts
import { Injectable } from '@angular/core';
import { Database } from '@angular/fire/database';
import { ref, push, set, onValue, update, query, orderByChild } from 'firebase/database';
import { Observable } from 'rxjs';

export type SessionRequestStatus = 'new' | 'in_review' | 'contacted' | 'closed';

export interface SessionRequest {
  id?: string;
  name: string;
  age: number;
  job: string;
  maritalStatus: string;
  whatsapp: string;

  // ✅ nationality select + other
  nationality: string;        // مثال: "مصر" أو "غير ذلك"
  nationalityOther?: string;  // مثال: "ألمانيا" لو اختار "غير ذلك"

  problem: string;

  // checkbox
  acceptedPolicy: boolean;

  // pricing
  currency: 'EGP' | 'USD';
  price: number;

  // meta
  createdAt: number;
  status: SessionRequestStatus;
  notes?: string;
  updatedAt?: number;

  // optional field used in your booking page
  acknowledged?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SessionRequestsService {
  private basePath = 'sessionRequests';

  constructor(private db: Database) {}

  async createRequest(payload: Omit<SessionRequest, 'id' | 'createdAt' | 'status'>) {
    const listRef = ref(this.db, this.basePath);
    const newRef = push(listRef);

    const data: SessionRequest = {
      ...payload,
      createdAt: Date.now(),
      status: 'new',
    };

    await set(newRef, data);
    return newRef.key as string;
  }

  watchAll(): Observable<SessionRequest[]> {
    return new Observable<SessionRequest[]>((subscriber) => {
      const qy = query(ref(this.db, this.basePath), orderByChild('createdAt'));

      const unsubscribe = onValue(
        qy,
        (snap) => {
          const val = snap.val() || {};
          const list: SessionRequest[] = Object.keys(val).map((id) => ({
            id,
            ...val[id],
          }));

          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          subscriber.next(list);
        },
        (err) => subscriber.error(err)
      );

      return () => unsubscribe();
    });
  }

  async patch(id: string, patch: Partial<SessionRequest>) {
    const r = ref(this.db, `${this.basePath}/${id}`);
    await update(r, { ...patch, updatedAt: Date.now() });
  }
}
