import { Component, HostListener, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { CartService } from '../../core/cart.service';
import { ArsPipe } from '../../shared/ars.pipe';
import { QtyStepperComponent } from '../../shared/qty-stepper.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-cart-drawer',
  imports: [RouterLink, LucideAngularModule, ArsPipe, QtyStepperComponent],
  animations: [
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('220ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('200ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('panel', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('380ms cubic-bezier(.22,1,.36,1)', style({ transform: 'none' })),
        query('.line', [style({ opacity: 0, transform: 'translateX(20px)' }), stagger(50, animate('260ms ease-out', style({ opacity: 1, transform: 'none' })))], { optional: true }),
      ]),
      transition(':leave', [animate('240ms cubic-bezier(.4,0,1,1)', style({ transform: 'translateX(100%)' }))]),
    ]),
    trigger('line', [
      transition(':leave', [animate('200ms ease-in', style({ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0 }))]),
    ]),
  ],
  template: `
    @if (cart.abierto()) {
      <div class="backdrop" @backdrop (click)="cerrar()"></div>
      <aside class="drawer" @panel role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header>
          <div>
            <h2 id="drawer-title">Tu pedido</h2>
            <span class="muted">{{ cart.cantidadPacks() }} {{ cart.cantidadPacks() === 1 ? 'pack' : 'packs' }}</span>
          </div>
          <button type="button" class="icon-btn" (click)="cerrar()" aria-label="Cerrar pedido"><lucide-icon [img]="i.X" [size]="22" /></button>
        </header>

        @if (cart.vacio()) {
          <div class="empty">
            <div class="ico"><lucide-icon [img]="i.ShoppingBag" [size]="30" /></div>
            <h3>Todavía no agregaste nada</h3>
            <p class="muted">Recorré la tienda y armá tu pedido por packs.</p>
            <a routerLink="/tienda" class="btn btn-primary" (click)="cerrar()">Ir a la tienda <lucide-icon [img]="i.ArrowRight" [size]="18" /></a>
          </div>
        } @else {
          <ul class="lines">
            @for (item of cart.items(); track item.productoId) {
              <li class="line" @line>
                <a class="thumb" [routerLink]="['/producto', item.productoId]" (click)="cerrar()" tabindex="-1">
                  @if (item.imagen) { <img [src]="item.imagen" [alt]="item.nombre" /> }
                  @else { <lucide-icon [img]="i.GlassWater" [size]="26" /> }
                </a>
                <div class="info">
                  <span class="brand">{{ item.marca }}</span>
                  <a class="name" [routerLink]="['/producto', item.productoId]" (click)="cerrar()">{{ item.nombre }}</a>
                  <span class="muted small">{{ item.unidadesPorPack > 1 ? 'Pack x' + item.unidadesPorPack : 'Unidad' }} · {{ item.precioPack | ars }}</span>
                  <div class="row-q">
                    <app-qty-stepper size="sm" [valor]="item.packs" [min]="1" [max]="item.packsDisponibles" [etiqueta]="item.nombre" (cambiar)="cart.setPacks(item.productoId, $event)" />
                    <button type="button" class="icon-btn del" (click)="cart.quitar(item.productoId)" [attr.aria-label]="'Quitar ' + item.nombre">
                      <lucide-icon [img]="i.Trash2" [size]="18" />
                    </button>
                  </div>
                </div>
                <span class="subtotal">{{ item.packs * item.precioPack | ars }}</span>
              </li>
            }
          </ul>

          <footer>
            <div class="total">
              <span>Total estimado</span>
              <strong>{{ cart.total() | ars }}</strong>
            </div>
            <p class="muted small note"><lucide-icon [img]="i.ShieldCheck" [size]="15" /> El total final se confirma al pagar. Pagás seguro con Mercado Pago.</p>
            <button type="button" class="btn btn-primary btn-lg btn-block" (click)="irA('/checkout')">
              Finalizar compra <lucide-icon [img]="i.ArrowRight" [size]="18" />
            </button>
            <button type="button" class="btn btn-ghost btn-block" (click)="irA('/carrito')">Ver detalle del pedido</button>
          </footer>
        }
      </aside>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; z-index: 400; background: rgba(26, 17, 48, .5); backdrop-filter: blur(2px); }
    .drawer { position: fixed; z-index: 401; top: 0; right: 0; bottom: 0; width: min(440px, 100vw); background: var(--cream-50); display: flex; flex-direction: column; box-shadow: var(--shadow-lg); }
    header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 16px 24px; border-bottom: 1px solid var(--border);
      h2 { font-size: 1.5rem; margin: 0; } }
    .lines { list-style: none; margin: 0; padding: 8px 20px; overflow-y: auto; flex: 1; }
    .line { display: grid; grid-template-columns: 76px 1fr auto; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--border); overflow: hidden; }
    .thumb { width: 76px; height: 86px; border-radius: 12px; overflow: hidden; background: var(--cream-200); display: grid; place-items: center; color: var(--berry-600);
      img { width: 100%; height: 100%; object-fit: cover; } }
    .info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .brand { font-size: .7rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--primary); }
    .name { font-weight: 600; color: var(--ink-900); text-decoration: none; &:hover { color: var(--primary); } }
    .small { font-size: .84rem; }
    .row-q { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
    .del { width: 38px; height: 38px; color: var(--ink-600); &:hover { color: var(--danger); background: var(--danger-bg); } }
    .subtotal { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
    footer { padding: 18px 24px 24px; border-top: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; gap: 10px; }
    .total { display: flex; justify-content: space-between; align-items: baseline; span { font-weight: 700; } strong { font-size: 1.6rem; font-variant-numeric: tabular-nums; } }
    .note { display: flex; gap: 6px; align-items: center; margin: 0 0 6px; }
    .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 32px;
      .ico { width: 72px; height: 72px; border-radius: 22px; background: var(--kumquat-100); color: var(--kumquat-600); display: grid; place-items: center; margin-bottom: 16px; }
      h3 { font-size: 1.3rem; } }
  `,
})
export class CartDrawerComponent {
  readonly cart = inject(CartService);
  private router = inject(Router);
  readonly i = I;

  constructor() {
    effect(() => {
      document.body.style.overflow = this.cart.abierto() ? 'hidden' : '';
    });
  }

  cerrar(): void {
    this.cart.abierto.set(false);
  }

  irA(url: string): void {
    this.cerrar();
    this.router.navigateByUrl(url);
  }

  @HostListener('document:keydown.escape')
  esc(): void {
    if (this.cart.abierto()) this.cerrar();
  }
}
