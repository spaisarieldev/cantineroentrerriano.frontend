import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { Catalogo, Paginado, Producto, ProductoFiltro } from '../../core/models';
import { fotoPrincipal, mensajeError } from '../../core/http.utils';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../shared/confirm.service';
import { ArsPipe } from '../../shared/ars.pipe';
import { PaginationComponent } from '../../shared/pagination.component';
import { ActivoBadgeComponent } from '../../shared/badges.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-productos-list',
  imports: [RouterLink, FormsModule, LucideAngularModule, ArsPipe, PaginationComponent, ActivoBadgeComponent, EmptyStateComponent],
  template: `
    <div class="page-head">
      <div><h1>Productos</h1><p>Precios, stock, fotos y visibilidad en la tienda.</p></div>
      <a routerLink="/admin/productos/nuevo" class="btn btn-primary"><lucide-icon [img]="i.Plus" [size]="18" /> Nuevo producto</a>
    </div>

    <section class="panel">
      <div class="filters">
        <div class="input-icon">
          <lucide-icon [img]="i.Search" [size]="18" />
          <input class="input" type="search" placeholder="Buscar por nombre…" aria-label="Buscar por nombre" [ngModel]="buscar()" (ngModelChange)="onBuscar($event)" />
        </div>
        <select class="select" aria-label="Marca" [ngModel]="filtro().marcaId ?? null" (ngModelChange)="setFiltro({ marcaId: $event })">
          <option [ngValue]="null">Todas las marcas</option>
          @for (m of marcas(); track m.id) { <option [ngValue]="m.id">{{ m.nombre }}</option> }
        </select>
        <select class="select" aria-label="Variante" [ngModel]="filtro().varianteId ?? null" (ngModelChange)="setFiltro({ varianteId: $event })">
          <option [ngValue]="null">Todas las variantes</option>
          @for (v of variantes(); track v.id) { <option [ngValue]="v.id">{{ v.nombre }}</option> }
        </select>
        <select class="select" aria-label="Estado" [ngModel]="filtro().activo ?? null" (ngModelChange)="setFiltro({ activo: $event })">
          <option [ngValue]="null">Activos e inactivos</option>
          <option [ngValue]="true">Solo activos</option>
          <option [ngValue]="false">Solo inactivos</option>
        </select>
      </div>

      @if (error()) {
        <div class="panel-body"><div class="alert alert-danger"><lucide-icon [img]="i.AlertCircle" [size]="20" /><p>{{ error() }}</p></div></div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th><button type="button" class="sort" (click)="ordenar('nombre')">Producto <lucide-icon [img]="iconoOrden('nombre')" [size]="14" /></button></th>
                <th>Marca / variante</th>
                <th class="num"><button type="button" class="sort" (click)="ordenar('precioUnitario')">Precio <lucide-icon [img]="iconoOrden('precioUnitario')" [size]="14" /></button></th>
                <th class="num"><button type="button" class="sort" (click)="ordenar('stock')">Stock <lucide-icon [img]="iconoOrden('stock')" [size]="14" /></button></th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @if (cargando() && !datos()) {
                @for (s of [1, 2, 3, 4, 5]; track s) { <tr class="table-skel"><td colspan="6"><div class="skeleton"></div></td></tr> }
              } @else {
                @for (p of datos()?.items ?? []; track p.id) {
                  <tr [class.inactive]="!p.activo">
                    <td>
                      <a class="cell-main plink" [routerLink]="['/admin/productos', p.id]">
                        @if (foto(p); as src) { <img class="thumb" [src]="src" alt="" loading="lazy" /> }
                        @else { <span class="thumb"><lucide-icon [img]="i.Image" [size]="18" /></span> }
                        <span><strong>{{ p.nombre }}</strong><small>{{ p.fotos.length }} {{ p.fotos.length === 1 ? 'foto' : 'fotos' }}</small></span>
                      </a>
                    </td>
                    <td><div class="two"><span>{{ p.marcaNombre }}</span><small>{{ p.varianteNombre ?? '—' }}</small></div></td>
                    <td class="num"><div class="two r"><strong>{{ p.precioPack | ars }}</strong><small>{{ p.unidadesPorPack > 1 ? 'pack x' + p.unidadesPorPack : 'unidad' }} · {{ p.precioUnitario | ars }} c/u</small></div></td>
                    <td class="num">
                      <div class="two r">
                        <strong [class.warn]="p.packsDisponibles > 0 && p.packsDisponibles <= 3" [class.crit]="p.packsDisponibles === 0">{{ p.stock }} u</strong>
                        <small>{{ p.packsDisponibles }} packs</small>
                      </div>
                    </td>
                    <td><app-activo-badge [activo]="p.activo" /></td>
                    <td class="actions">
                      <a class="icon-btn" [routerLink]="['/admin/productos', p.id]" [attr.aria-label]="'Editar ' + p.nombre" title="Editar"><lucide-icon [img]="i.Pencil" [size]="18" /></a>
                      <button type="button" class="icon-btn" (click)="toggle(p)" [attr.aria-label]="(p.activo ? 'Desactivar ' : 'Activar ') + p.nombre" [title]="p.activo ? 'Desactivar' : 'Activar'">
                        <lucide-icon [img]="i.Power" [size]="18" />
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (datos()?.items?.length === 0) {
          <app-empty-state [icono]="i.Package" titulo="No hay productos" mensaje="Creá el primero o cambiá los filtros.">
            <a routerLink="/admin/productos/nuevo" class="btn btn-primary"><lucide-icon [img]="i.Plus" [size]="18" /> Nuevo producto</a>
          </app-empty-state>
        }
        @if (datos(); as d) {
          <div class="panel-foot"><app-pagination [page]="d.page" [pageSize]="d.pageSize" [total]="d.total" (cambiar)="setFiltro({ page: $event }, false)" /></div>
        }
      }
    </section>
  `,
  styles: `
    .plink { color: var(--ink-900); text-decoration: none; &:hover strong { color: var(--primary); } }
    .two { display: flex; flex-direction: column; small { color: var(--text-muted); } &.r { align-items: flex-end; } }
    .warn { color: var(--warning); } .crit { color: var(--danger); }
    .inactive td { opacity: .6; } .inactive td.actions { opacity: 1; }
    .sort { display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; font: inherit; color: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; padding: 0; }
    .panel-body .alert { margin: 0; }
  `,
})
export class ProductosListComponent {
  private api = inject(PanelApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly i = I;

  readonly datos = signal<Paginado<Producto> | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtro = signal<ProductoFiltro>({});
  readonly buscar = signal('');
  readonly marcas = signal<Catalogo[]>([]);
  readonly variantes = signal<Catalogo[]>([]);

  private carga$ = new Subject<ProductoFiltro>();
  private busqueda$ = new Subject<string>();

  constructor() {
    const destroy = inject(DestroyRef);
    this.api.catalogo('marcas', { pageSize: 100, orderBy: 'nombre' }).subscribe({ next: r => this.marcas.set(r.items), error: () => void 0 });
    this.api.catalogo('variantes', { pageSize: 100, orderBy: 'nombre' }).subscribe({ next: r => this.variantes.set(r.items), error: () => void 0 });

    this.carga$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(null); }),
      switchMap(f => this.api.productos(f).pipe(catchError(e => { this.error.set(mensajeError(e)); return of(null); }))),
      takeUntilDestroyed(destroy),
    ).subscribe(r => { this.cargando.set(false); if (r) this.datos.set(r); });

    this.busqueda$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroy))
      .subscribe(t => this.setFiltro({ buscar: t || null }));

    this.route.queryParamMap.pipe(takeUntilDestroyed(destroy)).subscribe(q => {
      const num = (k: string) => (q.get(k) ? Number(q.get(k)) : null);
      const activo = q.get('activo');
      const f: ProductoFiltro = {
        page: num('page') ?? 1,
        pageSize: 20,
        marcaId: num('marcaId'),
        varianteId: num('varianteId'),
        activo: activo === null ? null : activo === 'true',
        buscar: q.get('buscar'),
        orderBy: q.get('orderBy') ?? 'nombre',
        orderDir: (q.get('orderDir') as 'asc' | 'desc') ?? 'asc',
      };
      this.filtro.set(f);
      this.buscar.set(f.buscar ?? '');
      this.carga$.next(f);
    });
  }

  foto(p: Producto): string | null {
    return fotoPrincipal(p.fotos);
  }

  onBuscar(t: string): void {
    this.buscar.set(t);
    this.busqueda$.next(t.trim());
  }

  ordenar(campo: string): void {
    const f = this.filtro();
    const dir = f.orderBy === campo && f.orderDir === 'asc' ? 'desc' : 'asc';
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

  async toggle(p: Producto): Promise<void> {
    if (p.activo) {
      const ok = await this.confirm.preguntar({
        titulo: `¿Desactivar “${p.nombre}”?`,
        mensaje: 'Deja de mostrarse en la tienda y no se puede comprar. Podés volver a activarlo cuando quieras.',
        confirmar: 'Desactivar',
        peligro: true,
      });
      if (!ok) return;
    }
    this.api.activoProducto(p.id, !p.activo).subscribe({
      next: r => {
        this.datos.update(d => d && { ...d, items: d.items.map(x => (x.id === r.id ? r : x)) });
        this.toast.exito(r.activo ? `“${r.nombre}” está visible en la tienda.` : `“${r.nombre}” se ocultó de la tienda.`);
      },
      error: e => this.toast.error(mensajeError(e)),
    });
  }
}
