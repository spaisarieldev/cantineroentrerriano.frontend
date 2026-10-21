import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CatalogoService } from '../../core/catalogo.service';
import { fotoPrincipal } from '../../core/http.utils';
import { Opcion, ProductoPublico } from '../../core/models';
import { HeroComponent } from './hero.component';
import { ProductCardComponent } from '../shared/product-card.component';
import { I } from '../../shared/icons';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home',
  imports: [RouterLink, LucideAngularModule, HeroComponent, ProductCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private catalogo = inject(CatalogoService);
  private host = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  readonly i = I;

  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly destacados = signal<ProductoPublico[]>([]);
  readonly marcas = signal<Opcion[]>([]);

  readonly paso = signal(0);
  readonly faqAbierta = signal<number | null>(0);

  /** Fotos de productos para las imágenes laterales del hero. */
  readonly fotosHero = computed(() =>
    this.destacados().map(p => fotoPrincipal(p.fotos)).filter((s): s is string => !!s).slice(0, 2));

  /** Las líneas que se muestran en zigzag (máximo 4 para no alargar demasiado el inicio). */
  readonly lineas = computed(() => this.marcas().slice(0, 4));

  readonly beneficios = [
    { icono: I.Truck, titulo: 'Entrega coordinada', texto: 'Te contactamos para coordinar', tono: 'sand' },
    { icono: I.Package, titulo: 'Venta por packs', texto: 'Precios mayoristas', tono: 'green' },
    { icono: I.Store, titulo: 'Sin crear cuenta', texto: 'Pedís en minutos', tono: 'coral' },
    { icono: I.CreditCard, titulo: 'Pago seguro', texto: 'Crédito o débito por Mercado Pago', tono: 'purple' },
  ];

  readonly pasos = [
    { icono: I.ShoppingBag, titulo: 'Armá tu pedido', texto: 'Elegí los productos y la cantidad de packs. Ves el stock disponible en el momento.' },
    { icono: I.User, titulo: 'Completá tus datos', texto: 'Nombre, teléfono y dirección de entrega. Sin registrarte ni crear cuenta.' },
    { icono: I.CreditCard, titulo: 'Pagá con tarjeta', texto: 'Crédito o débito a través de Mercado Pago. Tus datos de tarjeta nunca pasan por nosotros.' },
    { icono: I.Truck, titulo: 'Coordinamos la entrega', texto: 'Te llega el mail de confirmación y nos comunicamos con vos para la entrega.' },
  ];

  readonly faqs = [
    { q: '¿Venden a particulares?', a: 'Somos venta mayorista: trabajamos con bares, restaurantes, almacenes y organizadores de eventos. Todos los productos se venden por packs.' },
    { q: '¿Cómo pago mi pedido?', a: 'Con tarjeta de crédito o débito a través de Mercado Pago. Tus datos de tarjeta nunca pasan por nosotros.' },
    { q: '¿Necesito crear una cuenta?', a: 'No. Elegís tus packs, completás nombre, teléfono y dirección de entrega, y listo.' },
    { q: '¿Cómo se coordina la entrega?', a: 'Cuando se acredita el pago te llega un mail de confirmación y nos comunicamos con vos para coordinar la entrega.' },
    { q: '¿Cómo sé si hay stock?', a: 'En la tienda ves los packs disponibles de cada producto en el momento. Si algo se agota, lo marcamos como “Sin stock”.' },
  ];

  private ctx?: gsap.Context;
  private reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    forkJoin({
      productos: this.catalogo.productos({ pageSize: 8, orderBy: 'nombre', orderDir: 'asc' }),
      marcas: this.catalogo.marcas(),
    }).subscribe({
      next: ({ productos, marcas }) => {
        this.destacados.set(productos.items);
        this.marcas.set(marcas);
        this.cargando.set(false);
        // Las tarjetas y líneas se renderizan después: refrescamos los triggers.
        setTimeout(() => this.animarDinamico(), 0);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  /** Foto de un producto de la línea (o null para mostrar un ícono). */
  imagenDe(m: Opcion): string | null {
    const p = this.destacados().find(x => x.marcaId === m.id && x.fotos?.length);
    if (p) return fotoPrincipal(p.fotos);
    return /kumquat/i.test(m.nombre) ? 'img/kumquat-hero.webp' : null;
  }

  descripcionLinea(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('kumquat')) return 'Nuestro cóctel de autor: frutos rojos, cítricos y burbujas. Hielo, decoración y a la mesa, sin perder tiempo en la preparación.';
    if (n.includes('bolazo')) return 'La línea con nombre propio. Tragos con personalidad, pensados para salir rápido de la barra y repetir.';
    if (n.includes('refresco')) return 'Refrescos de fruta para acompañar cualquier comida o armar tus propios tragos.';
    if (n.includes('cóctel') || n.includes('coctel') || n.includes('lata')) return 'Cócteles clásicos en lata, listos para servir. Abrí, serví y listo.';
    return `Conocé todos los productos de ${nombre}, hechos en Entre Ríos y listos para tu stock.`;
  }

  /** Posición relativa de cada tarjeta de "Cómo comprar" respecto del paso activo (0 = al frente). */
  orden(k: number): number {
    return (k - this.paso() + this.pasos.length) % this.pasos.length;
  }

  moverPaso(dir: 1 | -1): void {
    this.paso.update(p => (p + dir + this.pasos.length) % this.pasos.length);
  }

  toggleFaq(k: number): void {
    this.faqAbierta.update(a => (a === k ? null : k));
  }

  ngAfterViewInit(): void {
    if (this.reducido) return;
    this.zone.runOutsideAngular(() => {
      this.ctx = gsap.context(() => {
        this.revelar('.reveal');
        gsap.utils.toArray<HTMLElement>('.parallax-img').forEach(img => {
          gsap.fromTo(img, { yPercent: -5, scale: 1.1 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentElement, scrub: 0.5 } });
        });
      }, this.host.nativeElement);
    });
  }

  private revelar(sel: string): void {
    gsap.set(sel, { opacity: 0, y: 40 });
    ScrollTrigger.batch(sel, {
      start: 'top 86%',
      once: true,
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }),
    });
  }

  private animarDinamico(): void {
    if (this.reducido || !this.ctx) return;
    this.zone.runOutsideAngular(() => {
      this.ctx!.add(() => {
        this.revelar('.reveal-late');
        gsap.set('.grid-item', { opacity: 0, scale: 0.94, y: 16 });
        ScrollTrigger.batch('.grid-item', {
          start: 'top 90%',
          once: true,
          onEnter: els => gsap.to(els, { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: { each: 0.06, grid: 'auto' }, ease: 'back.out(1.4)' }),
        });
        // Las imágenes de las líneas "flotan" levemente al hacer scroll.
        gsap.utils.toArray<HTMLElement>('.line-img').forEach((el, k) => {
          gsap.fromTo(el, { y: 30, rotate: k % 2 ? 8 : -8 }, { y: -30, rotate: k % 2 ? -4 : 4, ease: 'none', scrollTrigger: { trigger: el, scrub: 0.6 } });
        });
        ScrollTrigger.refresh();
      });
    });
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
  }
}
