import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { animate, query, style, transition, trigger } from '@angular/animations';
import { filter } from 'rxjs';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { I } from '../../shared/icons';

interface ItemNav { ruta: string; texto: string; icono: LucideIconData; exacto?: boolean; soloSuper?: boolean; }

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  animations: [
    trigger('ruta', [
      transition('* <=> *', [
        query(':enter', [style({ opacity: 0, transform: 'translateY(10px)' }), animate('320ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' }))], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="app" [class.open]="menu()">
      <aside class="side" aria-label="Navegación del panel">
        <a routerLink="/admin" class="brand">
          <span class="logo"><lucide-icon [img]="i.Citrus" [size]="20" /></span>
          <span><strong>Cantineros</strong><small>Panel de gestión</small></span>
        </a>

        @for (g of grupos; track g.titulo) {
          <div class="group">
            <span class="g-title">{{ g.titulo }}</span>
            @for (it of g.items; track it.ruta) {
              @if (!it.soloSuper || auth.esSuperAdmin()) {
                <a [routerLink]="it.ruta" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!it.exacto }" class="nav-item">
                  <lucide-icon [img]="it.icono" [size]="19" /> {{ it.texto }}
                </a>
              }
            }
          </div>
        }

        <div class="side-foot">
          <a routerLink="/" target="_blank" class="nav-item"><lucide-icon [img]="i.ExternalLink" [size]="19" /> Ver la tienda</a>
        </div>
      </aside>

      <div class="scrim" (click)="menu.set(false)"></div>

      <div class="main">
        <header class="top">
          <button type="button" class="icon-btn burger" (click)="menu.set(!menu())" aria-label="Abrir menú"><lucide-icon [img]="i.Menu" [size]="22" /></button>
          <div class="grow"></div>
          <div class="user">
            <button type="button" class="user-btn" (click)="userMenu.set(!userMenu())" [attr.aria-expanded]="userMenu()" aria-haspopup="menu">
              <span class="avatar">{{ iniciales() }}</span>
              <span class="u-info"><strong>{{ auth.usuario()?.nombre }}</strong><small>{{ auth.usuario()?.rol === 'SuperAdmin' ? 'Super admin' : 'Administrador' }}</small></span>
              <lucide-icon [img]="i.ChevronDown" [size]="16" />
            </button>
            @if (userMenu()) {
              <div class="dropdown" role="menu">
                <span class="email">{{ auth.usuario()?.email }}</span>
                <a routerLink="/admin/mi-cuenta" role="menuitem" (click)="userMenu.set(false)"><lucide-icon [img]="i.KeyRound" [size]="16" /> Cambiar contraseña</a>
                <button type="button" role="menuitem" (click)="auth.logout()"><lucide-icon [img]="i.LogOut" [size]="16" /> Cerrar sesión</button>
              </div>
            }
          </div>
        </header>
        <main class="content" [@ruta]="o.isActivated ? o.activatedRoute : ''">
          <router-outlet #o="outlet" />
        </main>
      </div>
    </div>
  `,
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  private router = inject(Router);
  readonly i = I;
  readonly menu = signal(false);
  readonly userMenu = signal(false);

  readonly grupos: { titulo: string; items: ItemNav[] }[] = [
    { titulo: 'General', items: [
      { ruta: '/admin', texto: 'Resumen', icono: I.LayoutDashboard, exacto: true },
      { ruta: '/admin/pedidos', texto: 'Pedidos', icono: I.Receipt },
      { ruta: '/admin/clientes', texto: 'Clientes', icono: I.Users },
    ] },
    { titulo: 'Catálogo', items: [
      { ruta: '/admin/productos', texto: 'Productos', icono: I.Package },
      { ruta: '/admin/marcas', texto: 'Marcas', icono: I.Tags },
      { ruta: '/admin/variantes', texto: 'Variantes', icono: I.Layers },
      { ruta: '/admin/motivos-stock', texto: 'Motivos de stock', icono: I.ListChecks },
    ] },
    { titulo: 'Sistema', items: [
      { ruta: '/admin/usuarios', texto: 'Usuarios', icono: I.UserCog, soloSuper: true },
      { ruta: '/admin/mi-cuenta', texto: 'Mi cuenta', icono: I.User },
    ] },
  ];

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.menu.set(false);
      this.userMenu.set(false);
    });
  }

  iniciales(): string {
    const n = this.auth.usuario()?.nombre ?? '';
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';
  }
}
