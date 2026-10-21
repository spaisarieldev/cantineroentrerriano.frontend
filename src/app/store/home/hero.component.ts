import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, computed, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { I } from '../../shared/icons';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero centrado estilo "pop": fotos que flotan sobre círculos de color (anillo violeta,
 * disco coral y disco crema), titular grande, menú vertical a la izquierda y la marca
 * gigante en vertical a la derecha.
 * - Angular Animations: entrada del texto.
 * - GSAP: presentación de las fotos y círculos, flotación continua y parallax con scroll/mouse.
 * Con prefers-reduced-motion se muestra todo en su estado final.
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink, LucideAngularModule],
  animations: [
    trigger('intro', [
      transition(':enter', [
        query('.fade', style({ opacity: 0, transform: 'translateY(22px)' }), { optional: true }),
        query('.fade', stagger(120, animate('800ms 350ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' }))), { optional: true }),
      ]),
    ]),
  ],
  template: `
    <section class="hero" #hero aria-labelledby="hero-title">
      <nav class="side" aria-label="Accesos rápidos">
        <a routerLink="/" fragment="como-comprar">Cómo comprar</a>
        <a routerLink="/" fragment="lineas">Líneas</a>
        <a routerLink="/tienda">Tienda</a>
        <span class="side-sep" aria-hidden="true"></span>
        <a class="side-ig" href="https://instagram.com/cantinerosentrerrianos" target="_blank" rel="noopener" aria-label="Instagram">ig</a>
      </nav>

      <span class="watermark" aria-hidden="true">CANTINEROS</span>

      <div class="container inner" @intro [@.disabled]="!animar()">
        <div class="stage" #stage aria-hidden="true">
          <span class="c c-ring" style="--d: 1.4"></span>
          <span class="c c-ring-sm" style="--d: 1.8"></span>
          <span class="c c-coral" style="--d: 0.8"></span>
          <span class="c c-sand" style="--d: 1.1"></span>

          @if (laterales()[0]; as src) {
            <figure class="pic pic-l" style="--d: 2"><img [src]="src" alt="" /></figure>
          }
          @if (laterales()[1]; as src) {
            <figure class="pic pic-r" style="--d: 2.4"><img [src]="src" alt="" /></figure>
          }
          <figure class="pic pic-main" style="--d: 1.6">
            <picture>
              <source srcset="img/kumquat-hero.webp" type="image/webp" />
              <img src="img/kumquat-hero.jpg" width="1220" height="1330" alt="" fetchpriority="high" />
            </picture>
          </figure>
        </div>

        <div class="copy" #copy>
          <h1 id="hero-title" class="fade">Cantineros</h1>
          <p class="lead fade">
            Cócteles en lata, Bolazo, refrescos y la línea Kumquat, listos para tu bar, almacén o evento.
            Comprá por packs y pagá seguro con Mercado Pago.
          </p>
          <div class="ctas fade">
            <a routerLink="/tienda" class="btn btn-dark btn-lg">Ver la tienda</a>
            <a routerLink="/" fragment="como-comprar" class="btn btn-light btn-lg">Cómo comprar</a>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './hero.component.scss',
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  readonly i = I;
  private zone = inject(NgZone);
  private reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly animar = signal(!this.reducido);

  /** Fotos de productos reales para las imágenes laterales (se usan hasta 2). */
  readonly fotos = input<string[]>([]);
  readonly laterales = computed(() => this.fotos().slice(0, 2));

  private hero = viewChild.required<ElementRef<HTMLElement>>('hero');
  private stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private copy = viewChild.required<ElementRef<HTMLElement>>('copy');

  private ctx?: gsap.Context;
  private quitarMouse?: () => void;

  ngAfterViewInit(): void {
    if (this.reducido) return;

    this.zone.runOutsideAngular(() => {
      this.ctx = gsap.context(() => {
        const hero = this.hero().nativeElement;

        // 1) Presentación: los círculos crecen y las fotos caen girando.
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.from('.c', { scale: 0, opacity: 0, duration: 1.4, stagger: 0.08, transformOrigin: '50% 50%' }, 0.1)
          .from('.pic-main', { y: -120, rotate: 12, opacity: 0, duration: 1.4 }, 0.25);

        // Las fotos laterales llegan más tarde (dependen de la API): las animamos al aparecer.
        this.animarLaterales();

        // 2) Flotación continua de la foto principal.
        gsap.to('.pic-main img', { y: -14, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 });
        gsap.to('.c-ring', { rotate: 360, duration: 40, repeat: -1, ease: 'none' });

        // 3) Parallax con scroll.
        const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
        gsap.to('.c-coral', { y: 80, ease: 'none', scrollTrigger: st });
        gsap.to('.c-sand', { y: 40, ease: 'none', scrollTrigger: st });
        gsap.to('.watermark', { yPercent: -18, ease: 'none', scrollTrigger: st });
        gsap.to(this.copy().nativeElement, { y: -30, opacity: 0.4, ease: 'none', scrollTrigger: { trigger: hero, start: 'center center', end: 'bottom top', scrub: true } });
      }, this.hero().nativeElement);

      // 4) Parallax con el mouse (solo puntero fino): cada capa se desplaza según su --d
      //    usando la propiedad CSS `translate`, que no pisa los transform de GSAP.
      if (matchMedia('(pointer: fine)').matches) {
        const stage = this.stage().nativeElement;
        const onMove = (e: PointerEvent) => {
          stage.style.setProperty('--mx', (e.clientX / window.innerWidth - 0.5).toFixed(3));
          stage.style.setProperty('--my', (e.clientY / window.innerHeight - 0.5).toFixed(3));
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        this.quitarMouse = () => window.removeEventListener('pointermove', onMove);
      }
    });
  }

  private obs?: MutationObserver;

  private animarLaterales(): void {
    const stage = this.stage().nativeElement;
    let hechas = 0;
    const animar = () => {
      const pics = Array.from(stage.querySelectorAll<HTMLElement>('.pic-l, .pic-r')).filter(p => !p.dataset['in']);
      if (!pics.length) return;
      const run = () => pics.forEach((p, k) => {
        p.dataset['in'] = '1';
        hechas++;
        gsap.from(p, { y: -100, rotate: k ? 30 : -30, opacity: 0, duration: 1.3, ease: 'expo.out', delay: 0.15 * k });
        gsap.to(p.querySelector('img'), { y: -10, duration: 2.6 + k * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.3 });
      });
      // Si el contexto ya existe, registramos las animaciones para que se reviertan al destruir.
      if (this.ctx) this.ctx.add(run); else run();
    };
    animar();
    if (hechas >= 2) return;
    this.obs = new MutationObserver(() => { animar(); if (hechas >= 2) this.obs?.disconnect(); });
    this.obs.observe(stage, { childList: true });
  }

  ngOnDestroy(): void {
    this.obs?.disconnect();
    this.quitarMouse?.();
    this.ctx?.revert();
  }
}
