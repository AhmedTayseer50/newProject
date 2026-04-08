import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private auth = inject(Auth);
  private observeAuthUser(): Observable<User | null> {
    return new Observable<User | null>((subscriber) => {
      const unsubscribe = this.auth.onAuthStateChanged(
        (user) => subscriber.next(user),
        (error) => subscriber.error(error),
        () => subscriber.complete(),
      );

      return () => unsubscribe();
    });
  }

  // Email فقط (قراءة فقط)
  email$: Observable<string | null> = this.observeAuthUser().pipe(
    map(u => u?.email ?? null)
  );
}
