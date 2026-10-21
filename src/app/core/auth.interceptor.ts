import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const PANEL = `${environment.apiUrl}/panel/`;

function conToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Agrega el Bearer a los endpoints del panel. Ante un 401 intenta un refresh (una sola vez)
 * y reintenta el request; si el refresh falla, la sesión expiró.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(PANEL)) return next(req);

  const auth = inject(AuthService);

  return next(conToken(req, auth.accessToken)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return auth.refrescar().pipe(
        switchMap(sesion => {
          if (!sesion) {
            auth.expirar();
            return throwError(() => err);
          }
          return next(conToken(req, sesion.accessToken));
        }),
      );
    }),
  );
};
