import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { I } from '../../shared/icons';

/** Marco de las pantallas de acceso al panel: foto a la izquierda, formulario a la derecha. */
@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink, LucideAngularModule],
  animations: [
    trigger('in', [
      transition(':enter', [style({ opacity: 0, transform: 'translateY(16px)' }), animate('520ms 80ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' }))]),
    ]),
  ],
  template: `
    <div class="shell">
      <aside class="art" aria-hidden="true">
        <img src="img/kumquat-hero.webp" alt="" />
        <div class="art-copy">
          <span class="logo"><lucide-icon [img]="i.Citrus" [size]="22" /></span>
          <p class="quote">“Cada pedido que entra es una barra que se llena.”</p>
          <span>Panel de Cantineros Entrerrianos</span>
        </div>
      </aside>
      <main class="side">
        <a routerLink="/" class="home"><lucide-icon [img]="i.ArrowLeft" [size]="16" /> Volver a la tienda</a>
        <div class="box" @in>
          <h1>{{ titulo() }}</h1>
          @if (subtitulo()) { <p class="muted sub">{{ subtitulo() }}</p> }
          <ng-content />
        </div>
      </main>
    </div>
  `,
  styles: `
    .shell { min-height: 100vh; display: grid; grid-template-columns: 1fr; background: var(--cream-50); @media (min-width: 960px) { grid-template-columns: 1.1fr 1fr; } }
    .art { display: none; position: relative; overflow: hidden; background: var(--wine-950); @media (min-width: 960px) { display: block; }
      img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; animation: kb 24s ease-in-out infinite alternate; }
      &::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, rgba(42,27,74,.94) 0%, rgba(75,42,123,.35) 55%, rgba(42,27,74,.45) 100%); } }
    @keyframes kb { from { transform: scale(1.04); } to { transform: scale(1.14) translate(-1.5%, -1%); } }
    .art-copy { position: absolute; z-index: 1; left: 48px; right: 48px; bottom: 48px; color: var(--cream-50);
      .logo { width: 46px; height: 46px; border-radius: 14px; background: var(--kumquat-500); color: var(--ink-900); display: grid; place-items: center; margin-bottom: 20px; transform: rotate(-8deg); }
      .quote { font-family: var(--font-display); font-weight: 600; font-size: 1.8rem; line-height: 1.2; margin-bottom: 12px; }
      span { opacity: .75; font-weight: 700; } }
    .side { display: flex; flex-direction: column; padding: 24px; }
    .home { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); text-decoration: none; font-weight: 700; font-size: .9rem; padding: 8px 0; &:hover { color: var(--primary); } }
    .box { width: 100%; max-width: 420px; margin: auto; padding: 32px 0;
      h1 { font-size: clamp(1.7rem, 3.4vw, 2.2rem); font-weight: 600; }
      .sub { margin-bottom: 28px; } }
  `,
})
export class AuthShellComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>();
  readonly i = I;
}
