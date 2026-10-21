import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { CartService } from '../../core/cart.service';
import { CatalogoService } from '../../core/catalogo.service';
import { ArsPipe } from '../../shared/ars.pipe';
import { QtyStepperComponent } from '../../shared/qty-stepper.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-cart-page',
  imports: [RouterLink, LucideAngularModule, ArsPipe, QtyStepperComponent, EmptyStateComponent],
  animations: [
    trigger('row', [
      transition(':leave', [animate('220ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))]),
    ]),
  ],
  template: `
    <div class="container page">
      <h1>Tu pedido</h1>

      @if (cart.vacio()) {
        <div class="card">
          <app-empty-state [icono]="i.ShoppingBag" titulo="Tu pedido está vacío" mensaje="Agregá packs desde la tienda para empezar.">
            <a routerLink="/tienda" class="btn btn-primary">Ir a la tienda <lucide-icon [img]="i.ArrowRight" [size]="18" /></a>
          </app-empty-state>
        </div>
      } @else {
        @if (ajustado()) {
          <div class="alert alert-warning" role="status">
            <lucide-icon [img]="i.AlertTriangle" [size]="20" />
            <p><strong>Actualizamos tu pedido</strong>Algunos precios o cantidades cambiaron según el stock disponible.</p>
          </div>
        }
        <div class="layout">
          <ul class="list card">
            @for (item of cart.items(); track item.productoId) {
              <li @row>
                <a class="thumb" [routerLink]="['/producto', item.productoId]" tabindex="-1">
                  @if (item.imagen) { <img [src]="item.imagen" [alt]="item.nombre" /> } @else { <lucide-icon [img]="i.GlassWater" [size]="30" /> }
                </a>
                <div class="info">
                  <span class="brand">{{ item.marca }}{{ item.variante ? ' · ' + item.variante : '' }}</span>
                  <a [routerLink]="['/producto', item.productoId]" class="name">{{ item.nombre }}</a>
                  <span class="muted sm">{{ item.unidadesPorPack > 1 ? 'Pack x' + item.unidadesPorPack : 'Unidad' }} · {{ item.precioPack | ars }} c/pack</span>
                  @if (item.packs >= item.packsDisponibles) { <span class="max">Máximo disponible</span> }
                </div>
                <app-qty-stepper size="sm" [valor]="item.packs" [min]="1" [max]="item.packsDisponibles" [etiqueta]="item.nombre" (cambiar)="cart.setPacks(item.productoId, $event)" />
                <span class="sub">{{ item.packs * item.precioPack | ars }}</span>
                <button type="button" class="icon-btn del" (click)="cart.quitar(item.productoId)" [attr.aria-label]="'Quitar ' + item.nombre"><lucide-icon [img]="i.Trash2" [size]="18" /></button>
              </li>
            }
          </ul>

          <aside class="summary card">
            <h2>Resumen</h2>
            <dl>
              <div><dt>Packs</dt><dd>{{ cart.cantidadPacks() }}</dd></div>
              <div><dt>Unidades</dt><dd>{{ unidades() }}</dd></div>
              <div class="total"><dt>Total</dt><dd>{{ cart.total() | ars }}</dd></div>
            </dl>
            <a routerLink="/checkout" class="btn btn-primary btn-lg btn-block">Continuar al pago <lucide-icon [img]="i.ArrowRight" [size]="18" /></a>
            <a routerLink="/tienda" class="btn btn-ghost btn-block">Seguir comprando</a>
            <p class="secure"><lucide-icon [img]="i.Lock" [size]="15" /> Pago protegido por Mercado Pago</p>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding-block: 40px 80px; }
    h1 { font-size: clamp(2rem, 4vw, 2.8rem); }
    .alert { margin-bottom: 20px; }
    .layout { display: grid; gap: 24px; grid-template-columns: 1fr; align-items: start; @media (min-width: 960px) { grid-template-columns: 1fr 360px; } }
    .list { list-style: none; margin: 0; padding: 4px 20px; }
    li { display: grid; grid-template-columns: 80px 1fr; gap: 12px 16px; align-items: center; padding: 18px 0; border-bottom: 1px solid var(--border);
      &:last-child { border-bottom: 0; }
      @media (min-width: 640px) { grid-template-columns: 88px 1fr auto 110px 44px; } }
    .thumb { width: 80px; height: 90px; border-radius: 12px; overflow: hidden; background: var(--cream-200); display: grid; place-items: center; color: var(--berry-600); grid-row: span 2;
      img { width: 100%; height: 100%; object-fit: cover; } @media (min-width: 640px) { grid-row: auto; width: 88px; } }
    .info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .brand { font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--primary); }
    .name { font-weight: 600; font-size: 1.08rem; color: var(--ink-900); text-decoration: none; &:hover { color: var(--primary); } }
    .sm { font-size: .86rem; }
    .max { font-size: .78rem; font-weight: 600; color: var(--warning); }
    .sub { font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
    .del:hover { color: var(--danger); background: var(--danger-bg); }
    .summary { padding: 24px; @media (min-width: 960px) { position: sticky; top: calc(var(--header-h) + 20px); }
      h2 { font-size: 1.4rem; }
      dl { margin: 0 0 20px; div { display: flex; justify-content: space-between; padding: 8px 0; } dt { color: var(--text-muted); } dd { margin: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
        .total { border-top: 1px solid var(--border); margin-top: 6px; padding-top: 14px; dt { color: var(--ink-900); font-weight: 600; } dd { font-size: 1.6rem; font-weight: 700; } } }
      .btn + .btn { margin-top: 8px; } }
    .secure { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 14px 0 0; color: var(--text-muted); font-size: .85rem; }
  `,
})
export class CartPageComponent {
  readonly cart = inject(CartService);
  private catalogo = inject(CatalogoService);
  readonly i = I;
  readonly ajustado = signal(false);

  unidades(): number {
    return this.cart.items().reduce((a, i) => a + i.packs * i.unidadesPorPack, 0);
  }

  constructor() {
    if (this.cart.vacio()) return;
    const antes = JSON.stringify(this.cart.items().map(i => [i.productoId, i.packs, i.precioPack]));
    this.catalogo.productos({ pageSize: 100 }).subscribe({
      next: res => {
        this.cart.sincronizar(res.items);
        const despues = JSON.stringify(this.cart.items().map(i => [i.productoId, i.packs, i.precioPack]));
        this.ajustado.set(antes !== despues);
      },
      error: () => void 0,
    });
  }
}
