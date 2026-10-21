import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ProblemDetails } from './models';

/** Arma HttpParams salteando null/undefined/''. */
export function toParams(obj: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

export function problem(err: unknown): ProblemDetails | null {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
    return err.error as ProblemDetails;
  }
  return null;
}

/** Mensaje legible para el usuario a partir de un error de la API (ProblemDetails en español). */
export function mensajeError(err: unknown, porDefecto = 'Ocurrió un error inesperado. Probá de nuevo en unos segundos.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No pudimos conectarnos con el servidor. Revisá tu conexión.';
    if (err.status === 429) return 'Hiciste demasiados intentos seguidos. Esperá un minuto y volvé a probar.';
    const pd = problem(err);
    if (pd?.errors) {
      const primeros = Object.values(pd.errors).flat();
      if (primeros.length) return primeros.join(' ');
    }
    if (pd?.detail) return pd.detail;
    if (pd?.title) return pd.title;
  }
  return porDefecto;
}

/** Errores de validación por campo (claves en camelCase como las manda la API). */
export function erroresPorCampo(err: unknown): Record<string, string> {
  const pd = problem(err);
  const out: Record<string, string> = {};
  if (pd?.errors) {
    for (const [k, v] of Object.entries(pd.errors)) {
      const key = k.charAt(0).toLowerCase() + k.slice(1);
      out[key] = v.join(' ');
    }
  }
  return out;
}

/** Las fotos llegan como ruta relativa (/uploads/...). */
export function urlArchivo(ruta: string | null | undefined): string | null {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta)) return ruta;
  return `${environment.archivosUrl}${ruta}`;
}

export function fotoPrincipal(fotos: { ruta: string; principal: boolean; orden: number }[] | undefined): string | null {
  if (!fotos?.length) return null;
  const principal = fotos.find(f => f.principal) ?? [...fotos].sort((a, b) => a.orden - b.orden)[0];
  return urlArchivo(principal.ruta);
}
