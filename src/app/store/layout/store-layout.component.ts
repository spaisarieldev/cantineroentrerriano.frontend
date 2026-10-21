import { Component, DestroyRef, HostListener, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { filter } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { CartService } from '../../core/cart.service';
import { CartDrawerComponent } from './cart-drawer.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-store-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, CartDrawerComponent],
  animations: [
    trigger('menu', [
      transition(':enter', [style({ opacity: 0, transform: 'translateY(-8px)' }), animate('220ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))]),
    ]),
  ],
  template: `
    <a class="skip" href="#contenido">Saltar al contenido</a>

    <header class="nav" [class.scrolled]="scrolled()">
      <div class="container nav-inner">
        <a routerLink="/" class="brand" aria-label="Cantineros Entrerrianos, inicio">Cantineros</a>

        <nav class="links" aria-label="Principal">
          <a routerLink="/tienda" routerLinkActive="active">Tienda</a>
          <a routerLink="/" fragment="lineas">Líneas</a>
          <a routerLink="/" fragment="como-comprar">Cómo comprar</a>
          <a routerLink="/" fragment="contacto">Contacto</a>
        </nav>

        <div class="actions">
          <a routerLink="/tienda" class="icon-btn" aria-label="Buscar productos"><lucide-icon [img]="i.Search" [size]="19" /></a>
          <button type="button" class="icon-btn cart-btn" (click)="cart.abierto.set(true)" [attr.aria-label]="'Abrir pedido, ' + cart.cantidadPacks() + ' packs'">
            <lucide-icon [img]="i.ShoppingBag" [size]="19" />
            @if (cart.cantidadPacks() > 0) {
              <span class="count" [class.bump]="bump()">{{ cart.cantidadPacks() }}</span>
            }
          </button>
          <a routerLink="/admin" class="icon-btn user" aria-label="Acceso administradores"><lucide-icon [img]="i.User" [size]="19" /></a>
          <button type="button" class="icon-btn burger" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-controls="menu-movil" aria-label="Menú">
            <lucide-icon [img]="menu() ? i.X : i.Menu" [size]="22" />
          </button>
        </div>
      </div>

      @if (menu()) {
        <nav id="menu-movil" class="mobile" @menu aria-label="Menú móvil">
          <a routerLink="/" (click)="menu.set(false)">Inicio</a>
          <a routerLink="/tienda" (click)="menu.set(false)">Tienda</a>
          <a routerLink="/" fragment="lineas" (click)="menu.set(false)">Líneas</a>
          <a routerLink="/" fragment="como-comprar" (click)="menu.set(false)">Cómo comprar</a>
          <a routerLink="/" fragment="preguntas" (click)="menu.set(false)">Preguntas</a>
          <a routerLink="/" fragment="contacto" (click)="menu.set(false)">Contacto</a>
        </nav>
      }
    </header>

    <main id="contenido">
      <router-outlet />
    </main>

    <footer class="footer" id="contacto">
      <div class="container foot-grid">
        <div class="foot-brand">
          <a routerLink="/" class="brand" aria-label="Cantineros Entrerrianos, inicio">Cantineros</a>
          <p>Cócteles en lata, Bolazo, refrescos y Kumquat. Venta mayorista hecha en Entre Ríos.</p>
          <ul class="social" aria-label="Redes">
            <li><a href="https://instagram.com/cantinerosentrerrianos" target="_blank" rel="noopener" aria-label="Instagram de Cantineros Entrerrianos"><lucide-icon [img]="i.Instagram" [size]="16" /></a></li>
          </ul>
        </div>

        <nav class="foot-col" aria-labelledby="f-tienda">
          <h2 id="f-tienda">Tienda</h2>
          <a routerLink="/tienda">Todos los productos</a>
          <a routerLink="/" fragment="lineas">Nuestras líneas</a>
          <a routerLink="/carrito">Mi pedido</a>
        </nav>

        <nav class="foot-col" aria-labelledby="f-ayuda">
          <h2 id="f-ayuda">Ayuda</h2>
          <a routerLink="/" fragment="como-comprar">Cómo comprar</a>
          <a routerLink="/" fragment="preguntas">Preguntas frecuentes</a>
          <a routerLink="/admin">Acceso administradores</a>
        </nav>

        <div class="foot-col">
          <h2>Contacto</h2>
          <span><lucide-icon [img]="i.MapPin" [size]="15" /> Entre Ríos, Argentina</span>
          <span><lucide-icon [img]="i.Store" [size]="15" /> Venta exclusiva mayorista</span>
          <span><lucide-icon [img]="i.Package" [size]="15" /> Venta por packs</span>
        </div>

        <div class="foot-col search">
          <h2>Buscá tu producto</h2>
          <form class="foot-form" role="search" (submit)="buscar($event, q.value)">
            <label class="sr-only" for="foot-q">Buscar productos</label>
            <input id="foot-q" #q type="search" placeholder="Ej: Kumquat" autocomplete="off" />
            <button type="submit" aria-label="Buscar"><lucide-icon [img]="i.ArrowRight" [size]="16" /></button>
          </form>
        </div>
      </div>

      <div class="legal">
        <div class="container legal-inner">
          <span>© {{ anio }} Cantineros Entrerrianos · Beber con moderación. Prohibida su venta a menores de 18 años.</span>
          <span class="pay" aria-label="Medios de pago: tarjeta de crédito o débito vía Mercado Pago">
            <span class="pay-chip c1" aria-hidden="true"><lucide-icon [img]="i.CreditCard" [size]="13" /></span>
            <span class="pay-chip c2" aria-hidden="true"><lucide-icon [img]="i.ShieldCheck" [size]="13" /></span>
            <span class="pay-chip c3" aria-hidden="true"><lucide-icon [img]="i.Lock" [size]="13" /></span>
            <span class="pay-txt" aria-hidden="true">Mercado Pago</span>
          </span>
        </div>
      </div>
    </footer>

    <app-cart-drawer />
  `,
  styleUrl: './store-layout.component.scss',
})
export class StoreLayoutComponent {
  readonly cart = inject(CartService);
  private router = inject(Router);
  readonly i = I;
  readonly anio = new Date().getFullYear();

  readonly menu = signal(false);
  readonly scrolled = signal(false);
  readonly bump = signal(false);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        this.menu.set(false);
      });

    let primero = true;
    effect(() => {
      this.cart.pulso();
      if (primero) { primero = false; return; }
      this.bump.set(false);
      requestAnimationFrame(() => this.bump.set(true));
      setTimeout(() => this.bump.set(false), 500);
    });
  }

  buscar(e: Event, texto: string): void {
    e.preventDefault();
    const q = texto.trim();
    this.router.navigate(['/tienda'], { queryParams: q ? { buscar: q } : {} });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }
}
