import { Component, inject } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../core/toast.service';
import { I } from './icons';

@Component({
  selector: 'app-toast-container',
  imports: [LucideAngularModule],
  animations: [
    trigger('toast', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px) scale(.96)' }),
        animate('260ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' })),
      ]),
      transition(':leave', [animate('180ms ease-in', style({ opacity: 0, transform: 'translateX(24px)' }))]),
    ]),
  ],
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (t of toasts.toasts(); track t.id) {
        <div [class]="'toast toast-' + t.tipo" @toast role="status">
          <lucide-icon [img]="t.tipo === 'success' ? i.CheckCircle2 : t.tipo === 'error' ? i.AlertCircle : t.tipo === 'warning' ? i.AlertTriangle : i.Info" [size]="20" />
          <div class="body">
            @if (t.titulo) { <strong>{{ t.titulo }}</strong> }
            <span>{{ t.mensaje }}</span>
          </div>
          <button class="close" type="button" (click)="toasts.cerrar(t.id)" aria-label="Cerrar aviso">
            <lucide-icon [img]="i.X" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts { position: fixed; z-index: 1000; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 10px; width: min(380px, calc(100vw - 32px)); }
    .toast { display: flex; gap: 12px; align-items: flex-start; padding: 14px 14px 14px 16px; border-radius: 14px; background: var(--wine-950); color: var(--cream-50); box-shadow: var(--shadow-lg); border-left: 4px solid var(--kumquat-500); }
    .toast-success { border-left-color: #3fbf7a; } .toast-success lucide-icon { color: #6ee7a8; }
    .toast-error { border-left-color: #ff6b5e; } .toast-error lucide-icon { color: #ff8a80; }
    .toast-warning lucide-icon, .toast-info lucide-icon { color: var(--kumquat-400); }
    lucide-icon { flex-shrink: 0; margin-top: 1px; }
    .body { flex: 1; font-size: .93rem; line-height: 1.4; strong { display: block; margin-bottom: 2px; } }
    .close { border: 0; background: transparent; color: inherit; opacity: .7; cursor: pointer; padding: 4px; border-radius: 6px; display: grid; place-items: center; min-width: 28px; min-height: 28px; &:hover { opacity: 1; background: rgba(255,255,255,.1); } }
  `,
})
export class ToastContainerComponent {
  readonly toasts = inject(ToastService);
  readonly i = I;
}
