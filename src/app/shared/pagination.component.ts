import { Component, computed, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { I } from './icons';

@Component({
  selector: 'app-pagination',
  imports: [LucideAngularModule],
  template: `
    @if (total() > 0) {
      <nav class="pager" aria-label="Paginación">
        <span class="info">{{ desde() }}–{{ hasta() }} de {{ total() }}</span>
        @if (totalPages() > 1) {
          <div class="pages">
            <button type="button" class="icon-btn" [disabled]="page() <= 1" (click)="cambiar.emit(page() - 1)" aria-label="Página anterior">
              <lucide-icon [img]="i.ChevronLeft" [size]="18" />
            </button>
            @for (p of paginas(); track $index) {
              @if (p === 0) {
                <span class="dots" aria-hidden="true">…</span>
              } @else {
                <button type="button" class="num" [class.active]="p === page()" [attr.aria-current]="p === page() ? 'page' : null" (click)="cambiar.emit(p)">{{ p }}</button>
              }
            }
            <button type="button" class="icon-btn" [disabled]="page() >= totalPages()" (click)="cambiar.emit(page() + 1)" aria-label="Página siguiente">
              <lucide-icon [img]="i.ChevronRight" [size]="18" />
            </button>
          </div>
        }
      </nav>
    }
  `,
  styles: `
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 4px; }
    .info { color: var(--text-muted); font-size: .9rem; font-variant-numeric: tabular-nums; }
    .pages { display: flex; align-items: center; gap: 4px; }
    .num { min-width: 40px; height: 40px; border-radius: 10px; border: 1px solid transparent; background: transparent; font-weight: 700; cursor: pointer; font-variant-numeric: tabular-nums;
      &:hover { background: var(--surface-2); }
      &.active { background: var(--wine-900); color: var(--cream-50); } }
    .dots { padding: 0 6px; color: var(--text-muted); }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly cambiar = output<number>();
  readonly i = I;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly desde = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  readonly hasta = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  /** Números de página con 0 como separador "…". */
  readonly paginas = computed(() => {
    const total = this.totalPages();
    const actual = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, k) => k + 1);
    const lista = [...new Set([1, total, actual, actual - 1, actual + 1])].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const out: number[] = [];
    lista.forEach((p, idx) => {
      if (idx > 0 && p - lista[idx - 1] > 1) out.push(0);
      out.push(p);
    });
    return out;
  });
}
