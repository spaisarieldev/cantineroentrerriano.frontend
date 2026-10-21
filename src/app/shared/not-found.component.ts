import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { I } from './icons';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <main class="nf">
      <span class="code">404</span>
      <h1>Esta copa quedó vacía</h1>
      <p>La página que buscás no existe o se movió.</p>
      <a routerLink="/" class="btn btn-accent btn-lg"><lucide-icon [img]="i.Home" [size]="18" /> Volver al inicio</a>
    </main>
  `,
  styles: `
    .nf { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; background: radial-gradient(circle at 50% 30%, var(--wine-800), var(--wine-950)); color: var(--cream-50); }
    .code { font-family: var(--font-display); font-size: clamp(5rem, 18vw, 9rem); font-weight: 600; line-height: 1; background: linear-gradient(120deg, var(--kumquat-400), var(--berry-500)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); margin: 12px 0 8px; }
    p { opacity: .8; margin-bottom: 28px; }
  `,
})
export class NotFoundComponent {
  readonly i = I;
}
