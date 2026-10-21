import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { EstadoEnvio, EstadoPedido, Paginado, PedidoFiltro, PedidoResumen } from '../../core/models';
import { mensajeError } from '../../core/http.utils';
import { ArsPipe } from '../../shared/ars.pipe';
import { PaginationComponent } from '../../shared/pagination.component';
import { EstadoEnvioComponent, EstadoPedidoComponent } from '../../shared/badges.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-pedidos-list',
  imports: [RouterLink, DatePipe, FormsModule, LucideAngularModule, ArsPipe, PaginationComponent, EstadoPedidoComponent, EstadoEnvioComponent, EmptyStateComponent],
  template: `
    <div class="page-head">
      <div><h1>Pedidos</h1><p>Seguí los pagos y marcá los despachos.</p></div>
    </div>

    <div class="tabs" role="tablist" aria-label="Filtrar por estado">
      @for (t of tabs; track t.texto) {
        <button type="button" role="tab" class="tab" [class.on]="esTab(t.q)" [attr.aria-selected]="esTab(t.q)" (click)="setFiltro(t.q, true)">{{ t.texto }}</button>
      }
    </div>

    <section class="panel">
      <div class="filters">
        <div class="input-icon">
          <lucide-icon [img]="i.Search" [size]="18" />
          <input class="input" type="search" placeholder="Buscar por cliente o DNI…" aria-label="Buscar por cliente o DNI" [ngModel]="buscar()" (ngModelChange)="onBuscar($event)" />
        </div>
        <select class="select" aria-label="Estado de envío" [ngModel]="filtro().estadoEnvio ?? null" (ngModelChange)="setFiltro({ estadoEnvio: $event })">
          <option [ngValue]="null">Cualquier envío</option>
          <option value="NoDespachado">No despachado</option>
          <option value="Despachado">Despachado</option>
        </select>
        <label class="date"><span>Desde</span><input class="input" type="date" [ngModel]="filtro().fechaDesde ?? ''" (ngModelChange)="setFiltro({ fechaDesde: $event || null })" /></label>
        <label class="date"><span>Hasta</span><input class="input" type="date" [ngModel]="hastaVisible()" (ngModelChange)="setHasta($event)" /></label>
        @if (hayFiltros()) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="limpiar()"><lucide-icon [img]="i.X" [size]="16" /> Limpiar</button>
        }
      </div>

      @if (error()) {
        <div class="panel-body"><div class="alert alert-danger"><lucide-icon [img]="i.AlertCircle" [size]="20" /><p>{{ error() }}</p></div></div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th><button type="button" class="sort" (click)="ordenar('fecha')">Fecha <lucide-icon [img]="iconoOrden('fecha')" [size]="14" /></button></th>
                <th>Cliente</th><th>Estado</th><th>Envío</th>
                <th class="num"><button type="button" class="sort" (click)="ordenar('total')">Total <lucide-icon [img]="iconoOrden('total')" [size]="14" /></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @if (cargando() && !datos()) {
                @for (s of [1, 2, 3, 4, 5]; track s) { <tr class="table-skel"><td colspan="7"><div class="skeleton"></div></td></tr> }
              } @else {
                @for (p of datos()?.items ?? []; track p.id) {
                  <tr class="clickable" [class.alert-row]="p.requiereRevision" [routerLink]="['/admin/pedidos', p.id]">
                    <td><strong>#{{ p.id }}</strong></td>
                    <td>{{ p.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td><div class="cli"><strong>{{ p.clienteNombre }}</strong><small>DNI {{ p.clienteDni }}</small></div></td>
                    <td>
                      <div class="row-b"><app-estado-pedido [estado]="p.estado" />
                        @if (p.requiereRevision) { <span class="badge badge-danger" title="Cancelado con un pago aprobado: resolver a mano">Revisar</span> }</div>
                    </td>
                    <td><app-estado-envio [estado]="p.estadoEnvio" /></td>
                    <td class="num"><strong>{{ p.total | ars }}</strong></td>
                    <td class="actions"><lucide-icon [img]="i.ChevronRight" [size]="18" /></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (datos()?.items?.length === 0) {
          <app-empty-state [icono]="i.Receipt" titulo="No hay pedidos" mensaje="No encontramos pedidos con estos filtros." />
        }
        @if (datos(); as d) {
          <div class="panel-foot"><app-pagination [page]="d.page" [pageSize]="d.pageSize" [total]="d.total" (cambiar)="setFiltro({ page: $event }, false)" /></div>
        }
      }
    </section>
  `,
  styles: `
    .tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 14px; scrollbar-width: none; }
    .tab { min-height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface); font-weight: 700; cursor: pointer; white-space: nowrap; transition: all var(--dur-fast);
      &:hover { border-color: var(--primary); } &.on { background: var(--wine-900); border-color: var(--wine-900); color: var(--cream-50); } }
    .date { display: inline-flex; align-items: center; gap: 8px; font-size: .85rem; font-weight: 700; color: var(--text-muted); }
    .cli { display: flex; flex-direction: column; small { color: var(--text-muted); } }
    .row-b { display: flex; gap: 6px; flex-wrap: wrap; }
    .sort { display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; font: inherit; color: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; padding: 0; }
    .alert-row td:first-child { box-shadow: inset 4px 0 0 var(--danger); }
    .panel-body .alert { margin: 0; }
  `,
})
export class PedidosListComponent {
  private api = inject(PanelApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly i = I;

  readonly tabs: { texto: string; q: Record<string, unknown> }[] = [
    { texto: 'Todos', q: { estado: null, requiereRevision: null } },
    { texto: 'Pagados', q: { estado: 'Pagado', requiereRevision: null } },
    { texto: 'Pendientes', q: { estado: 'Pendiente', requiereRevision: null } },
    { texto: 'Cancelados', q: { estado: 'Cancelado', requiereRevision: null } },
    { texto: 'Reembolsados', q: { estado: 'Reembolsado', requiereRevision: null } },
    { texto: 'Requieren revisión', q: { estado: null, requiereRevision: true } },
  ];

  readonly datos = signal<Paginado<PedidoResumen> | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtro = signal<PedidoFiltro>({});
  readonly buscar = signal('');

  private carga$ = new Subject<PedidoFiltro>();
  private busqueda$ = new Subject<string>();

  constructor() {
    const destroy = inject(DestroyRef);
    this.carga$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(null); }),
      switchMap(f => this.api.pedidos(f).pipe(catchError(e => { this.error.set(mensajeError(e)); return of(null); }))),
      takeUntilDestroyed(destroy),
    ).subscribe(r => { this.cargando.set(false); if (r) this.datos.set(r); });

    this.busqueda$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroy))
      .subscribe(t => this.setFiltro({ buscar: t || null }));

    this.route.queryParamMap.pipe(takeUntilDestroyed(destroy)).subscribe(q => {
      const f: PedidoFiltro = {
        page: Number(q.get('page') ?? 1),
        pageSize: 20,
        estado: (q.get('estado') as EstadoPedido) ?? null,
        estadoEnvio: (q.get('estadoEnvio') as EstadoEnvio) ?? null,
        fechaDesde: q.get('fechaDesde'),
        fechaHasta: q.get('fechaHasta'),
        requiereRevision: q.get('requiereRevision') === 'true' ? true : null,
        buscar: q.get('buscar'),
        orderBy: q.get('orderBy') ?? 'fecha',
        orderDir: (q.get('orderDir') as 'asc' | 'desc') ?? 'desc',
      };
      this.filtro.set(f);
      this.buscar.set(f.buscar ?? '');
      this.carga$.next(f);
    });
  }

  esTab(q: Record<string, unknown>): boolean {
    const f = this.filtro();
    return (f.estado ?? null) === q['estado'] && (f.requiereRevision ?? null) === q['requiereRevision'];
  }

  hayFiltros(): boolean {
    const f = this.filtro();
    return !!(f.buscar || f.estadoEnvio || f.fechaDesde || f.fechaHasta);
  }

  /** fechaHasta es exclusiva en la API: el usuario elige el último día inclusive. */
  hastaVisible(): string {
    const h = this.filtro().fechaHasta;
    if (!h) return '';
    const d = new Date(h + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  setHasta(valor: string): void {
    if (!valor) { this.setFiltro({ fechaHasta: null }); return; }
    const d = new Date(valor + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    this.setFiltro({ fechaHasta: `${y}-${m}-${dd}` });
  }

  onBuscar(t: string): void {
    this.buscar.set(t);
    this.busqueda$.next(t.trim());
  }

  ordenar(campo: string): void {
    const f = this.filtro();
    const dir = f.orderBy === campo && f.orderDir === 'desc' ? 'asc' : 'desc';
    this.setFiltro({ orderBy: campo, orderDir: dir });
  }

  iconoOrden(campo: string) {
    const f = this.filtro();
    if (f.orderBy !== campo) return I.ChevronDown;
    return f.orderDir === 'asc' ? I.ArrowUp : I.ArrowDown;
  }

  setFiltro(cambios: Record<string, unknown>, resetPage = true): void {
    const queryParams = { ...cambios } as Record<string, unknown>;
    if (resetPage && !('page' in cambios)) queryParams['page'] = null;
    this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }

  limpiar(): void {
    this.setFiltro({ buscar: null, estadoEnvio: null, fechaDesde: null, fechaHasta: null });
  }
}
