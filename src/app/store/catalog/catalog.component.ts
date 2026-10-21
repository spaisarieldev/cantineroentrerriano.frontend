import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap, catchError, of } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogoService } from '../../core/catalogo.service';
import { CartService } from '../../core/cart.service';
import { Opcion, Paginado, ProductoFiltro, ProductoPublico } from '../../core/models';
import { ProductCardComponent } from '../shared/product-card.component';
import { PaginationComponent } from '../../shared/pagination.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { I } from '../../shared/icons';

type Orden = 'nombre-asc' | 'precioUnitario-asc' | 'precioUnitario-desc';

@Component({
  selector: 'app-catalog',
  imports: [FormsModule, LucideAngularModule, ProductCardComponent, PaginationComponent, EmptyStateComponent],
  template: `
    <section class="head">
      <span class="deco deco-ring r1" aria-hidden="true"></span>
      <span class="deco deco-dot r2" aria-hidden="true"></span>
      <span class="deco deco-sand r3" aria-hidden="true"></span>
      <div class="container">
        <span class="eyebrow">Tienda mayorista</span>
        <h1>Todos los productos</h1>
        <p>Comprás por packs. Los precios son por pack e incluyen el detalle por unidad.</p>
      </div>
    </section>

    <div class="container body">
      <div class="toolbar">
        <div class="input-icon search">
          <lucide-icon [img]="i.Search" [size]="18" />
          <label class="sr-only" for="buscar">Buscar productos</label>
          <input id="buscar" class="input" type="search" placeholder="Buscar por nombre…" [ngModel]="buscar()" (ngModelChange)="onBuscar($event)" autocomplete="off" />
        </div>
        <div class="selects">
          @if (variantes().length) {
            <label class="sr-only" for="variante">Variante</label>
            <select id="variante" class="select" [ngModel]="varianteId()" (ngModelChange)="setFiltro({ variante: $event })">
              <option [ngValue]="null">Todas las variantes</option>
              @for (v of variantes(); track v.id) { <option [ngValue]="v.id">{{ v.nombre }}</option> }
            </select>
          }
          <label class="sr-only" for="orden">Ordenar</label>
          <select id="orden" class="select" [ngModel]="orden()" (ngModelChange)="setFiltro({ orden: $event })">
            <option value="nombre-asc">Nombre (A–Z)</option>
            <option value="precioUnitario-asc">Menor precio</option>
            <option value="precioUnitario-desc">Mayor precio</option>
          </select>
        </div>
      </div>

      @if (marcas().length) {
        <div class="chips" role="group" aria-label="Filtrar por línea">
          <button type="button" class="chip" [class.active]="marcaId() === null" (click)="setFiltro({ marca: null })">Todas</button>
          @for (m of marcas(); track m.id) {
            <button type="button" class="chip" [class.active]="marcaId() === m.id" [attr.aria-pressed]="marcaId() === m.id" (click)="setFiltro({ marca: m.id })">{{ m.nombre }}</button>
          }
        </div>
      }

      @if (cargando() && !datos()) {
        <div class="grid">
          @for (s of [1, 2, 3, 4, 5, 6, 7, 8]; track s) {
            <div class="sk"><div class="skeleton img"></div><div class="skeleton t1"></div><div class="skeleton t2"></div></div>
          }
        </div>
      } @else if (error()) {
        <app-empty-state [icono]="i.AlertTriangle" titulo="No pudimos cargar la tienda" mensaje="Revisá tu conexión y volvé a intentar.">
          <button type="button" class="btn btn-primary" (click)="recargar()"><lucide-icon [img]="i.RefreshCw" [size]="18" /> Reintentar</button>
        </app-empty-state>
      } @else if (datos()?.items?.length === 0) {
        <app-empty-state [icono]="i.Search" titulo="No encontramos productos" mensaje="Probá con otra búsqueda o quitá los filtros.">
          <button type="button" class="btn" (click)="limpiar()">Quitar filtros</button>
        </app-empty-state>
      } @else if (datos()) { @let d = datos()!;
        <div class="grid" [class.loading]="cargando()">
          @for (p of d.items; track p.id; let k = $index) {
            <app-product-card [producto]="p" [style.--k]="k" />
          }
        </div>
        <app-pagination [page]="d.page" [pageSize]="d.pageSize" [total]="d.total" (cambiar)="setFiltro({ page: $event }, false)" />
      }
    </div>
  `,
  styles: `
    .head { position: relative; overflow: hidden; background: var(--cream-100); color: var(--ink-900); padding: 56px 0 92px;
      .container { position: relative; }
      h1 { font-size: clamp(2rem, 4.4vw, 3rem); font-weight: 600; margin: 10px 0 8px; }
      p { color: var(--text-muted); margin: 0; max-width: 520px; }
      .r1 { width: 150px; height: 150px; border-width: 22px; right: 14%; top: -50px; }
      .r2 { width: 90px; height: 90px; right: 6%; bottom: 34px; background: radial-gradient(circle at 40% 35%, var(--cream-100) 0 22%, var(--berry-600) 23%); }
      .r3 { width: 220px; height: 220px; right: 24%; bottom: -150px; }
      @media (max-width: 699px) { .r1 { right: -40px; } .r3 { display: none; } } }
    .body { padding-block: 32px 72px; }
    .toolbar { display: flex; gap: 12px; flex-wrap: wrap; margin-top: -60px; background: var(--surface); padding: 14px; border-radius: var(--radius-lg); box-shadow: var(--shadow); position: relative; z-index: 2; }
    .search { flex: 1 1 260px; }
    .selects { display: flex; gap: 10px; flex-wrap: wrap; .select { width: auto; min-width: 180px; } }
    .chips { display: flex; gap: 8px; overflow-x: auto; padding: 22px 2px 6px; scrollbar-width: none; }
    .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); margin-top: 20px; transition: opacity var(--dur); &.loading { opacity: .55; pointer-events: none; }
      // Entrada escalonada en CSS (la transición '* => *' de Angular Animations congelaba la página).
      > * { animation: card-in 380ms cubic-bezier(.22,1,.36,1) both; animation-delay: calc(var(--k, 0) * 45ms); } }
    @keyframes card-in { from { opacity: 0; transform: translateY(16px) scale(.97); } }
    .sk { display: flex; flex-direction: column; gap: 10px; .img { aspect-ratio: 4 / 4.4; border-radius: var(--radius-lg); } .t1 { height: 20px; width: 70%; } .t2 { height: 16px; width: 45%; } }
  `,
})
export class CatalogComponent implements OnInit {
  private catalogo = inject(CatalogoService);
  private cart = inject(CartService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly i = I;

  readonly marcas = signal<Opcion[]>([]);
  readonly variantes = signal<Opcion[]>([]);
  readonly datos = signal<Paginado<ProductoPublico> | null>(null);
  readonly cargando = signal(true);
  readonly error = signal(false);

  readonly buscar = signal('');
  readonly marcaId = signal<number | null>(null);
  readonly varianteId = signal<number | null>(null);
  readonly orden = signal<Orden>('nombre-asc');
  readonly filtroKey = signal('');

  private busqueda$ = new Subject<string>();
  private carga$ = new Subject<ProductoFiltro>();

  ngOnInit(): void {
    this.catalogo.marcas().subscribe({ next: m => this.marcas.set(m), error: () => void 0 });
    this.catalogo.variantes().subscribe({ next: v => this.variantes.set(v), error: () => void 0 });

    this.carga$
      .pipe(
        tap(() => { this.cargando.set(true); this.error.set(false); }),
        switchMap(f => this.catalogo.productos(f).pipe(catchError(() => { this.error.set(true); return of(null); }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        this.cargando.set(false);
        if (res) {
          this.datos.set(res);
          this.cart.sincronizar(res.items.filter(p => this.cart.packsDe(p.id) > 0));
        }
      });

    this.busqueda$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(texto => this.setFiltro({ buscar: texto || null }));

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => {
      const num = (k: string) => (q.get(k) ? Number(q.get(k)) : null);
      this.marcaId.set(num('marca'));
      this.varianteId.set(num('variante'));
      this.buscar.set(q.get('buscar') ?? '');
      this.orden.set((q.get('orden') as Orden) ?? 'nombre-asc');
      const [orderBy, orderDir] = this.orden().split('-') as [string, 'asc' | 'desc'];
      this.filtroKey.set(`${this.marcaId()}-${this.varianteId()}-${this.buscar()}-${this.orden()}`);
      this.carga$.next({
        page: num('page') ?? 1,
        pageSize: 12,
        orderBy,
        orderDir,
        marcaId: this.marcaId(),
        varianteId: this.varianteId(),
        buscar: this.buscar() || null,
      });
    });
  }

  onBuscar(texto: string): void {
    this.buscar.set(texto);
    this.busqueda$.next(texto.trim());
  }

  setFiltro(cambios: Record<string, unknown>, resetPage = true): void {
    const queryParams: Record<string, unknown> = { ...cambios };
    if (resetPage && !('page' in cambios)) queryParams['page'] = null;
    if (queryParams['orden'] === 'nombre-asc') queryParams['orden'] = null;
    if (queryParams['page'] === 1) queryParams['page'] = null;
    this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: !('page' in cambios) });
    if ('page' in cambios) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiar(): void {
    this.router.navigate([], { queryParams: {} });
  }

  recargar(): void {
    this.router.navigate([], { queryParams: { _: Date.now() }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
