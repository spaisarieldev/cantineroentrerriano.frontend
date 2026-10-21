import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { Cliente, Paginado } from '../../core/models';
import { mensajeError } from '../../core/http.utils';
import { PaginationComponent } from '../../shared/pagination.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-clientes-list',
  imports: [RouterLink, DatePipe, FormsModule, LucideAngularModule, PaginationComponent, EmptyStateComponent],
  template: `
    <div class="page-head"><div><h1>Clientes</h1><p>Se crean solos con cada compra, identificados por DNI.</p></div></div>
    <section class="panel">
      <div class="filters">
        <div class="input-icon">
          <lucide-icon [img]="i.Search" [size]="18" />
          <input class="input" type="search" placeholder="Buscar por nombre o DNI…" aria-label="Buscar por nombre o DNI" [ngModel]="texto()" (ngModelChange)="onBuscar($event)" />
        </div>
      </div>
      @if (error()) {
        <div class="panel-body"><div class="alert alert-danger" style="margin:0"><lucide-icon [img]="i.AlertCircle" [size]="20" /><p>{{ error() }}</p></div></div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Cliente</th><th>DNI</th><th>Cliente desde</th><th></th></tr></thead>
            <tbody>
              @if (cargando() && !datos()) {
                @for (s of [1, 2, 3, 4]; track s) { <tr class="table-skel"><td colspan="4"><div class="skeleton"></div></td></tr> }
              } @else {
                @for (c of datos()?.items ?? []; track c.id) {
                  <tr class="clickable" [routerLink]="['/admin/clientes', c.id]">
                    <td><div class="cell-main"><span class="thumb av">{{ c.nombre.charAt(0) }}</span><strong>{{ c.nombre }}</strong></div></td>
                    <td>{{ c.dni }}</td>
                    <td>{{ c.fechaCreacion | date: 'dd/MM/yyyy' }}</td>
                    <td class="actions"><lucide-icon [img]="i.ChevronRight" [size]="18" /></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (datos()?.items?.length === 0) { <app-empty-state [icono]="i.Users" titulo="Sin clientes" mensaje="Todavía no hay clientes con ese criterio." /> }
        @if (datos(); as d) {
          <div class="panel-foot"><app-pagination [page]="d.page" [pageSize]="d.pageSize" [total]="d.total" (cambiar)="cargar($event)" /></div>
        }
      }
    </section>
  `,
  styles: `.av { border-radius: 50% !important; background: var(--kumquat-100) !important; color: var(--kumquat-600) !important; font-weight: 700; }`,
})
export class ClientesListComponent {
  private api = inject(PanelApiService);
  readonly i = I;
  readonly datos = signal<Paginado<Cliente> | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly texto = signal('');
  private carga$ = new Subject<number>();
  private busqueda$ = new Subject<string>();

  constructor() {
    const destroy = inject(DestroyRef);
    this.carga$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(null); }),
      switchMap(page => this.api.clientes({ page, pageSize: 20, buscar: this.texto().trim() || undefined, orderBy: 'nombre', orderDir: 'asc' })
        .pipe(catchError(e => { this.error.set(mensajeError(e)); return of(null); }))),
      takeUntilDestroyed(destroy),
    ).subscribe(r => { this.cargando.set(false); if (r) this.datos.set(r); });
    this.busqueda$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroy)).subscribe(() => this.cargar(1));
    this.cargar(1);
  }

  cargar(page: number): void { this.carga$.next(page); }

  onBuscar(t: string): void {
    this.texto.set(t);
    this.busqueda$.next(t.trim());
  }
}
