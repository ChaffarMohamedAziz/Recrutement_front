import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'smart-recruit-theme';
  private readonly themeSubject = new BehaviorSubject<AppTheme>('light');

  readonly currentTheme$ = this.themeSubject.asObservable();

  get currentTheme(): AppTheme {
    return this.themeSubject.value;
  }

  initializeTheme(): void {
    const storedTheme = this.readStoredTheme();
    const preferredTheme = storedTheme ?? this.resolveSystemTheme();
    this.applyTheme(preferredTheme);
  }

  toggleTheme(): void {
    this.applyTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  applyTheme(theme: AppTheme): void {
    const body = this.document.body;
    body.classList.toggle('dark-theme', theme === 'dark');
    body.dataset['theme'] = theme;
    localStorage.setItem(this.storageKey, theme);
    this.themeSubject.next(theme);
  }

  private readStoredTheme(): AppTheme | null {
    const value = localStorage.getItem(this.storageKey);
    return value === 'dark' || value === 'light' ? value : null;
  }

  private resolveSystemTheme(): AppTheme {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
