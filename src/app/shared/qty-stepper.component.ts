import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { I } from './icons';

@Component({
  selector: 'app-qty-stepper',
  imports: [LucideAngularModule],
  template: `
    <div class="stepper" [class.sm]="size() === 'sm'" role="group" [attr.aria-label]="'Cantidad de packs de ' + etiqueta()">
      <button type="button" (click)="cambiar.emit(valor() - 1)" [disabled]="valor() <= min()" aria-label="Quitar un pack">
        <lucide-icon [img]="i.Minus" [size]="16" />
      </button>
      <output aria-live="polite">{{ valor() }}</output>
      <button type="button" (click)="cambiar.emit(valor() + 1)" [disabled]="valor() >= max()" aria-label="Agregar un pack">
        <lucide-icon [img]="i.Plus" [size]="16" />
      </button>
    </div>
  `,
  styles: `
    .stepper { display: inline-flex; align-items: center; border: 1.5px solid var(--border-strong); border-radius: var(--radius-pill); background: var(--surface); height: 46px; }
    button { width: 44px; height: 100%; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; border-radius: var(--radius-pill); color: var(--ink-700); transition: background var(--dur-fast);
      &:hover:not(:disabled) { background: var(--surface-2); color: var(--primary); }
      &:disabled { opacity: .35; cursor: not-allowed; } }
    output { min-width: 32px; text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
    .sm { height: 38px; button { width: 36px; } output { min-width: 26px; font-size: .92rem; } }
  `,
})
export class QtyStepperComponent {
  readonly valor = input.required<number>();
  readonly min = input(1);
  readonly max = input(99);
  readonly etiqueta = input('');
  readonly size = input<'md' | 'sm'>('md');
  readonly cambiar = output<number>();
  readonly i = I;
}
