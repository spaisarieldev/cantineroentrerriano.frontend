import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogoService } from '../../core/catalogo.service';
import { CartService } from '../../core/cart.service';
import { ProductoPublico } from '../../core/models';
import { urlArchivo } from '../../core/http.utils';
import { ArsPipe } from '../../shared/ars.pipe';
import { QtyStepperComponent } from '../../shared/qty-stepper.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ProductCardComponent } from '../shared/product-card.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, LucideAngularModule, ArsPipe, QtyStepperComponent, EmptyStateComponent, ProductCardComponent],
  animations: [
    trigger('img', [
      transition('* => *', [style({ opacity: 0, transform: 'scale(1.03)' }), animate('420ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' }))]),
    ]),
    trigger('enter', [
      transition(':enter', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('600ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' }))]),
    ]),
  ],
  template: `
    <div class="container page">
      <nav class="crumbs" aria-label="Ruta de navegación">
        <a routerLink="/">Inicio</a> <lucide-icon [img]="i.ChevronRight" [size]="14" />
        <a routerLink="/tienda">Tienda</a> <lucide-icon [img]="i.ChevronRight" [size]="14" />
        <span aria-current="page">{{ producto()?.nombre ?? '…' }}</span>
      </nav>

      @if (cargando()) {
        <div class="layout">
          <div class="skeleton gal-sk"></div>
          <div class="stack"><div class="skeleton" style="height:22px;width:30%"></div><div class="skeleton" style="height:48px;width:80%"></div><div class="skeleton" style="height:120px"></div></div>
        </div>
      } @else if (noExiste()) {
        <app-empty-state [icono]="i.PackageOpen" titulo="Este producto no está disponible" mensaje="Puede que se haya dado de baja. Mirá el resto de la tienda.">
          <a routerLink="/tienda" class="btn btn-primary">Ir a la tienda</a>
        </app-empty-state>
      } @else if (producto()) { @let p = producto()!;
        <div class="layout" @enter>
          <div class="gallery">
            <div class="main-img">
              @if (fotos().length) {
                <img [src]="fotos()[activa()]" [alt]="p.nombre" [@img]="activa()" />
              } @else {
                <div class="ph"><lucide-icon [img]="i.GlassWater" [size]="80" [strokeWidth]="1.2" /></div>
              }
              @if (agotado()) { <span class="tag-out">Sin stock</span> }
            </div>
            @if (fotos().length > 1) {
              <div class="thumbs" role="tablist" aria-label="Fotos del producto">
                @for (f of fotos(); track f; let k = $index) {
                  <button type="button" role="tab" [attr.aria-selected]="k === activa()" [class.on]="k === activa()" (click)="activa.set(k)" [attr.aria-label]="'Foto ' + (k + 1)">
                    <img [src]="f" alt="" loading="lazy" />
                  </button>
                }
              </div>
            }
          </div>

          <div class="info">
            <div class="meta">
              <span class="brand">{{ p.marcaNombre }}</span>
              @if (p.varianteNombre) { <span class="badge no-dot">{{ p.varianteNombre }}</span> }
            </div>
            <h1>{{ p.nombre }}</h1>

            <div class="price-box">
              <div>
                <span class="big">{{ p.precioPack | ars }}</span>
                <span class="muted">{{ p.unidadesPorPack > 1 ? 'por pack de ' + p.unidadesPorPack + ' unidades' : 'por unidad' }}</span>
              </div>
              <span class="unit">{{ p.precioUnitario | ars }} <small>c/u</small></span>
            </div>

            @if (p.descripcion) { <p class="desc">{{ p.descripcion }}</p> }

            <div class="stock" [class.low]="p.packsDisponibles > 0 && p.packsDisponibles <= 3" [class.out]="agotado()">
              <lucide-icon [img]="agotado() ? i.Ban : i.CheckCircle2" [size]="18" />
              @if (agotado()) { Sin stock por el momento }
              @else if (p.packsDisponibles <= 3) { ¡Quedan {{ p.packsDisponibles }} {{ p.packsDisponibles === 1 ? 'pack' : 'packs' }}! }
              @else { {{ p.packsDisponibles }} packs disponibles }
            </div>

            @if (!agotado()) {
              <div class="buy">
                <app-qty-stepper [valor]="cantidad()" [min]="1" [max]="maxAgregable()" [etiqueta]="p.nombre" (cambiar)="cantidad.set($event)" />
                <button type="button" class="btn btn-primary btn-lg grow" [disabled]="maxAgregable() < 1" (click)="agregar(p)">
                  <lucide-icon [img]="i.ShoppingBag" [size]="20" />
                  Agregar · {{ p.precioPack * cantidad() | ars }}
                </button>
              </div>
              @if (enCarrito() > 0) {
                <p class="in-cart"><lucide-icon [img]="i.Check" [size]="16" /> Ya tenés {{ enCarrito() }} {{ enCarrito() === 1 ? 'pack' : 'packs' }} en tu pedido.
                  <button type="button" class="link" (click)="cart.abierto.set(true)">Ver pedido</button></p>
              }
            }

            <ul class="assure">
              <li><lucide-icon [img]="i.ShieldCheck" [size]="20" /><div><strong>Pago seguro</strong><span>Crédito o débito por Mercado Pago</span></div></li>
              <li><lucide-icon [img]="i.Truck" [size]="20" /><div><strong>Entrega coordinada</strong><span>Te contactamos al confirmar el pago</span></div></li>
              <li><lucide-icon [img]="i.Store" [size]="20" /><div><strong>Venta mayorista</strong><span>Precios por pack para tu negocio</span></div></li>
            </ul>
          </div>
        </div>

        @if (relacionados().length) {
          <section class="related">
            <h2>También de {{ p.marcaNombre }}</h2>
            <div class="rel-grid">
              @for (r of relacionados(); track r.id) { <app-product-card [producto]="r" /> }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .page { padding-block: 28px 80px; }
    .crumbs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: .88rem; color: var(--text-muted); margin-bottom: 24px;
      a { color: inherit; text-decoration: none; &:hover { color: var(--primary); } }
      span { color: var(--ink-900); font-weight: 700; } }
    .layout { display: grid; gap: 40px; grid-template-columns: 1fr; @media (min-width: 900px) { grid-template-columns: 1.05fr 1fr; gap: 56px; } }
    .gal-sk { aspect-ratio: 1; border-radius: var(--radius-lg); }
    .gallery { display: flex; flex-direction: column; gap: 12px; @media (min-width: 900px) { position: sticky; top: calc(var(--header-h) + 20px); align-self: start; } }
    .main-img { position: relative; aspect-ratio: 1; border-radius: var(--radius-lg); overflow: hidden; background: linear-gradient(160deg, var(--cream-100), var(--cream-200));
      img { width: 100%; height: 100%; object-fit: cover; } }
    .ph { width: 100%; height: 100%; display: grid; place-items: center; color: var(--berry-600); opacity: .5; }
    .tag-out { position: absolute; top: 16px; left: 16px; background: var(--ink-900); color: var(--cream-50); font-weight: 600; font-size: .8rem; padding: .35rem .8rem; border-radius: 999px; }
    .thumbs { display: flex; gap: 10px; overflow-x: auto;
      button { width: 76px; height: 76px; flex-shrink: 0; border-radius: 12px; overflow: hidden; border: 2px solid transparent; padding: 0; cursor: pointer; background: var(--cream-200); opacity: .7; transition: all var(--dur);
        &.on, &:hover { border-color: var(--primary); opacity: 1; } }
      img { width: 100%; height: 100%; object-fit: cover; } }
    .meta { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
    .brand { font-size: .8rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--primary); }
    h1 { font-size: clamp(2rem, 4.4vw, 3.1rem); margin-bottom: 20px; }
    .price-box { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 18px 20px; border-radius: var(--radius); background: var(--cream-100); border: 1px solid var(--border); margin-bottom: 20px;
      .big { display: block; font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
      .unit { font-weight: 600; font-size: 1.05rem; font-variant-numeric: tabular-nums; small { font-weight: 600; color: var(--text-muted); } } }
    .desc { color: var(--ink-700); font-size: 1.05rem; white-space: pre-line; }
    .stock { display: inline-flex; gap: 8px; align-items: center; font-weight: 600; color: var(--success); margin-bottom: 20px;
      &.low { color: var(--warning); } &.out { color: var(--danger); } }
    .buy { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .in-cart { display: flex; align-items: center; gap: 6px; margin-top: 12px; color: var(--success); font-weight: 700; font-size: .92rem; flex-wrap: wrap; }
    .link { background: none; border: 0; color: var(--primary); font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0; }
    .assure { list-style: none; padding: 0; margin: 32px 0 0; display: grid; gap: 12px; border-top: 1px solid var(--border); padding-top: 24px;
      li { display: flex; gap: 14px; align-items: flex-start; lucide-icon { color: var(--primary); margin-top: 2px; } }
      strong { display: block; } span { color: var(--text-muted); font-size: .9rem; } }
    .related { margin-top: 80px; h2 { font-size: 1.8rem; margin-bottom: 24px; } }
    .rel-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
  `,
})
export class ProductDetailComponent {
  readonly id = input.required<string>();
  private catalogo = inject(CatalogoService);
  private title = inject(Title);
  readonly cart = inject(CartService);
  readonly i = I;

  readonly producto = signal<ProductoPublico | null>(null);
  readonly relacionados = signal<ProductoPublico[]>([]);
  readonly cargando = signal(true);
  readonly noExiste = signal(false);
  readonly activa = signal(0);
  readonly cantidad = signal(1);

  readonly fotos = computed(() => {
    const p = this.producto();
    if (!p) return [];
    return [...p.fotos].sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden).map(f => urlArchivo(f.ruta)!);
  });
  readonly agotado = computed(() => (this.producto()?.packsDisponibles ?? 0) <= 0);
  readonly enCarrito = computed(() => (this.producto() ? this.cart.items().find(x => x.productoId === this.producto()!.id)?.packs ?? 0 : 0));
  readonly maxAgregable = computed(() => Math.max(0, (this.producto()?.packsDisponibles ?? 0) - this.enCarrito()));

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.cargar(id);
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.noExiste.set(false);
    this.activa.set(0);
    this.cantidad.set(1);
    this.catalogo.producto(id).subscribe({
      next: p => {
        this.producto.set(p);
        this.cargando.set(false);
        this.title.setTitle(`${p.nombre} · Cantineros Entrerrianos`);
        this.catalogo.productos({ marcaId: p.marcaId, pageSize: 5 }).subscribe({
          next: r => this.relacionados.set(r.items.filter(x => x.id !== p.id).slice(0, 4)),
          error: () => void 0,
        });
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.noExiste.set(true);
        if (e.status !== 404) this.producto.set(null);
      },
    });
  }

  agregar(p: ProductoPublico): void {
    this.cart.agregar(p, this.cantidad());
    this.cantidad.set(1);
  }
}
