import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Sesion, UsuarioSesion } from './models';

/**
 * Sesión del panel. El access token vive solo en memoria; el refresh token está en una
 * cookie httpOnly (Path=/api/v1/auth) que el navegador manda sola: al recargar la página
 * se recupera la sesión llamando a /auth/refresh.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = `${environment.apiUrl}/auth`;

  private readonly sesion = signal<Sesion | null>(null);
  private refresh$: Observable<Sesion | null> | null = null;

  readonly usuario = computed<UsuarioSesion | null>(() => this.sesion()?.usuario ?? null);
  readonly logueado = computed(() => this.sesion() !== null);
  readonly esSuperAdmin = computed(() => this.sesion()?.usuario.rol === 'SuperAdmin');

  get accessToken(): string | null {
    return this.sesion()?.accessToken ?? null;
  }

  login(email: string, password: string): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${this.api}/login`, { email, password }, { withCredentials: true })
      .pipe(tap(s => this.sesion.set(s)));
  }

  /** Renueva la sesión con la cookie. Comparte el request si hay varios en vuelo. */
  refrescar(): Observable<Sesion | null> {
    if (!this.refresh$) {
      this.refresh$ = this.http.post<Sesion>(`${this.api}/refresh`, null, { withCredentials: true }).pipe(
        tap(s => this.sesion.set(s)),
        catchError(() => {
          this.sesion.set(null);
          return of(null);
        }),
        finalize(() => (this.refresh$ = null)),
        shareReplay(1),
      );
    }
    return this.refresh$;
  }

  /** Para los guards: true si hay sesión (o si se pudo recuperar con el refresh). */
  asegurarSesion(): Observable<boolean> {
    if (this.sesion() && new Date(this.sesion()!.expiracion).getTime() > Date.now() + 15_000) {
      return of(true);
    }
    return this.refrescar().pipe(map(s => s !== null));
  }

  logout(): void {
    this.http.post(`${this.api}/logout`, null, { withCredentials: true }).subscribe({ error: () => void 0 });
    this.sesion.set(null);
    this.router.navigate(['/admin/login']);
  }

  /** Sesión vencida o inválida: limpia y manda al login conservando a dónde iba. */
  expirar(): void {
    this.sesion.set(null);
    this.router.navigate(['/admin/login'], { queryParams: { volver: this.router.url, motivo: 'expirada' } });
  }

  forgotPassword(email: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.api}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.api}/reset-password`, { token, password });
  }
}
