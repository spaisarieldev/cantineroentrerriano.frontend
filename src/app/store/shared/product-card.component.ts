import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProductoPublico } from '../../core/models';
import { CartService } from '../../core/cart.service';
import { fotoPrincipal } from '../../core/http.utils';
import { ArsPipe } from '../../shared/ars.pipe';
import { QtyStepperComponent } from '../../shared/qty-stepper.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, LucideAngularModule, ArsPipe, QtyStepperComponent],
  template: `
    @let p = producto();
    <article class="card-p" [class.agotado]="agotado()">
      <a class="media" [routerLink]="['/producto', p.id]" [attr.aria-label]="'Ver ' + p.nombre">
        @if (imagen(); as src) {
          <img [src]="src" [alt]="p.nombre" loading="lazy" decoding="async" />
        } @else {
          <div class="placeholder" aria-hidden="true">
            <lucide-icon [img]="i.GlassWater" [size]="44" [strokeWidth]="1.4" />
          </div>
        }
        <div class="tags">
          <span class="tag brand">{{ p.marcaNombre }}</span>
          @if (agotado()) {
            <span class="tag out">Sin stock</span>
          } @else if (p.packsDisponibles <= 3) {
            <span class="tag low">Últimos {{ p.packsDisponibles }}</span>
          }
        </div>
      </a>

      <div class="body">
        @if (p.varianteNombre) { <span class="variant">{{ p.varianteNombre }}</span> }
        <h3><a [routerLink]="['/producto', p.id]">{{ p.nombre }}</a></h3>
        <p class="pack">
          {{ p.unidadesPorPack > 1 ? 'Pack x' + p.unidadesPorPack : 'Por unidad' }}
          <span class="dot">·</span> {{ p.precioUnitario | ars }} c/u
        </p>

        <div class="foot">
          <span class="price" [attr.title]="p.unidadesPorPack > 1 ? 'Precio por pack' : 'Precio por unidad'">{{ p.precioPack | ars }}</span>
          @if (enCarrito() > 0) {
            <app-qty-stepper size="sm" [valor]="enCarrito()" [min]="0" [max]="p.packsDisponibles" [etiqueta]="p.nombre"
              (cambiar)="cart.setPacks(p.id, $event)" />
          } @else {
            <button type="button" class="btn btn-dark btn-sm add" [disabled]="agotado()" (click)="cart.agregar(p, 1)"
              [attr.aria-label]="'Agregar ' + p.nombre + ' al pedido'">
              Agregar
            </button>
          }
        </div>
      </div>
    </article>
  `,
  styles: `
    :host { display: block; }
    .card-p { height: 100%; display: flex; flex-direction: column; background: var(--white); border-radius: var(--radius); padding: 10px;
      box-shadow: 0 1px 0 var(--border), 0 14px 30px -22px rgba(42,27,74,.35);
      transition: transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out); }
    .card-p:hover { transform: translateY(-4px); box-shadow: 0 1px 0 var(--border), 0 26px 44px -24px rgba(42,27,74,.45); }
    .media { position: relative; display: block; aspect-ratio: 1; border-radius: 10px; overflow: hidden; isolation: isolate;
      background: radial-gradient(circle at 50% 58%, var(--sand-300) 0 38%, transparent 38.5%), var(--cream-100); }
    .media img { width: 100%; height: 100%; object-fit: contain; padding: 8%; transition: transform 700ms var(--ease-out); }
    .card-p:hover .media img { transform: scale(1.06) rotate(-3deg); }
    .placeholder { width: 100%; height: 100%; display: grid; place-items: center; color: var(--purple-600); opacity: .7; }
    .tags { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
    .tag { font-size: .68rem; font-weight: 600; letter-spacing: .04em; padding: .22rem .65rem; border-radius: 999px; background: var(--white); color: var(--purple-700); box-shadow: var(--shadow-sm); }
    .tag.low { background: var(--kumquat-500); color: var(--ink-900); }
    .tag.out { background: var(--ink-900); color: var(--white); }
    .body { padding: 14px 6px 4px; display: flex; flex-direction: column; flex: 1; }
    .variant { font-size: .68rem; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--berry-600); }
    h3 { font-size: 1rem; font-weight: 600; margin: 2px 0 2px; a { color: inherit; text-decoration: none; } a:hover { color: var(--purple-700); } }
    .pack { color: var(--text-muted); font-size: .78rem; margin-bottom: 14px; .dot { opacity: .5; } }
    .foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .price { font-size: 1rem; font-weight: 600; color: var(--ink-900); white-space: nowrap; }
    .add { margin-right: 4px; }
    .agotado .media { filter: grayscale(.7); }
  `,
})
export class ProductCardComponent {
  readonly producto = input.required<ProductoPublico>();
  readonly cart = inject(CartService);
  readonly i = I;

  readonly imagen = computed(() => fotoPrincipal(this.producto().fotos));
  readonly agotado = computed(() => this.producto().packsDisponibles <= 0);
  readonly enCarrito = computed(() => this.cart.items().find(x => x.productoId === this.producto().id)?.packs ?? 0);
}
