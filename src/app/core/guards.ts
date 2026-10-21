import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const panelGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.asegurarSesion().pipe(
    map(ok => ok || router.createUrlTree(['/admin/login'], { queryParams: { volver: state.url } })),
  );
};

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.esSuperAdmin() || router.createUrlTree(['/admin']);
};

/** Si ya hay sesión, el login redirige al panel. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.asegurarSesion().pipe(map(ok => (ok ? router.createUrlTree(['/admin']) : true)));
};
