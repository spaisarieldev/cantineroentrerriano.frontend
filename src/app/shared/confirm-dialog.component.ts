import { Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmService } from './confirm.service';
import { I } from './icons';

@Component({
  selector: 'app-confirm-dialog',
  imports: [LucideAngularModule],
  animations: [
    trigger('fade', [
      transition(':enter', [style({ opacity: 0 }), animate('180ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('140ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('pop', [
      transition(':enter', [style({ opacity: 0, transform: 'translate(-50%, -46%) scale(.97)' }), animate('240ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'translate(-50%, -50%)' }))]),
    ]),
  ],
  template: `
    @if (confirm.actual(); as c) {
      <div class="backdrop" @fade (click)="confirm.responder(false)"></div>
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-msg" @pop>
        <div class="icon" [class.danger]="c.peligro">
          <lucide-icon [img]="c.peligro ? i.AlertTriangle : i.Info" [size]="22" />
        </div>
        <h2 id="cd-title">{{ c.titulo }}</h2>
        <p id="cd-msg">{{ c.mensaje }}</p>
        <div class="actions">
          <button type="button" class="btn" (click)="confirm.responder(false)">{{ c.cancelar ?? 'Cancelar' }}</button>
          <button #ok type="button" class="btn" [class.btn-danger]="c.peligro" [class.btn-primary]="!c.peligro" (click)="confirm.responder(true)">{{ c.confirmar ?? 'Confirmar' }}</button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; background: rgba(26, 17, 48, .55); backdrop-filter: blur(3px); z-index: 900; }
    .dialog { position: fixed; z-index: 901; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(440px, calc(100vw - 32px)); background: var(--surface); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-lg); }
    .icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--info-bg); color: var(--info); margin-bottom: 14px; &.danger { background: var(--danger-bg); color: var(--danger); } }
    h2 { font-size: 1.35rem; margin-bottom: 8px; }
    p { color: var(--text-muted); margin-bottom: 24px; }
    .actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
  `,
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);
  readonly i = I;
  private ok = viewChild<ElementRef<HTMLButtonElement>>('ok');

  constructor() {
    effect(() => {
      const btn = this.ok();
      if (btn) setTimeout(() => btn.nativeElement.focus());
    });
  }

  @HostListener('document:keydown.escape')
  esc(): void {
    if (this.confirm.actual()) this.confirm.responder(false);
  }
}
