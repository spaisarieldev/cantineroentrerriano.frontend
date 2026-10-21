import { Injectable, signal } from '@angular/core';

export interface ConfirmOpciones {
  titulo: string;
  mensaje: string;
  confirmar?: string;
  cancelar?: string;
  peligro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly actual = signal<(ConfirmOpciones & { resolver: (ok: boolean) => void }) | null>(null);

  preguntar(opciones: ConfirmOpciones): Promise<boolean> {
    return new Promise(resolve => this.actual.set({ ...opciones, resolver: resolve }));
  }

  responder(ok: boolean): void {
    this.actual()?.resolver(ok);
    this.actual.set(null);
  }
}
