import { Injectable, signal } from '@angular/core';

export type TipoToast = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
  titulo?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  mostrar(tipo: TipoToast, mensaje: string, titulo?: string, ms = 4500): void {
    const id = ++this.seq;
    this.toasts.update(t => [...t, { id, tipo, mensaje, titulo }].slice(-4));
    setTimeout(() => this.cerrar(id), ms);
  }

  exito(mensaje: string, titulo?: string): void { this.mostrar('success', mensaje, titulo); }
  error(mensaje: string, titulo?: string): void { this.mostrar('error', mensaje, titulo, 7000); }
  info(mensaje: string, titulo?: string): void { this.mostrar('info', mensaje, titulo); }

  cerrar(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
