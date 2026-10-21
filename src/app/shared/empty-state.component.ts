import { Component, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { I } from './icons';

@Component({
  selector: 'app-empty-state',
  imports: [LucideAngularModule],
  template: `
    <div class="empty">
      <div class="ico"><lucide-icon [img]="icono() ?? i.Inbox" [size]="28" /></div>
      <h3>{{ titulo() }}</h3>
      @if (mensaje()) { <p>{{ mensaje() }}</p> }
      <ng-content />
    </div>
  `,
  styles: `
    .empty { text-align: center; padding: 56px 20px; display: flex; flex-direction: column; align-items: center; }
    .ico { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; background: var(--kumquat-100); color: var(--kumquat-600); margin-bottom: 16px; }
    h3 { font-size: 1.3rem; margin-bottom: 6px; }
    p { color: var(--text-muted); max-width: 380px; margin-bottom: 20px; }
  `,
})
export class EmptyStateComponent {
  readonly titulo = input.required<string>();
  readonly mensaje = input<string>();
  readonly icono = input<LucideIconData>();
  readonly i = I;
}
