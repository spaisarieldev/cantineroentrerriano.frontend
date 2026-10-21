import { Component, NgZone, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { CartService, ItemCarrito } from '../../core/cart.service';
import { CatalogoService } from '../../core/catalogo.service';
import { MercadoPagoService, clasificarPago, mensajeRechazo, EstadoResultado } from '../../core/mercadopago.service';
import { DatosPago, ItemPedidoCreado, ResultadoPago } from '../../core/models';
import { mensajeError, problem } from '../../core/http.utils';
import { ArsPipe } from '../../shared/ars.pipe';
import { I } from '../../shared/icons';

/** Pedido creado cuyo pago fue rechazado o no llegó a MP: se puede reintentar con el tokenPago. */
interface PedidoPendiente {
  pedidoId: number;
  tokenPago: string;
  total: number;
  expira: string | null;
  items: ItemCarrito[];
}

interface Resultado {
  estado: EstadoResultado;
  pedidoId: number;
  total: number;
  items: { nombre: string; packs: number; subtotal: number }[];
}

const KEY_PENDIENTE = 'ce.pedidoPendiente.v1';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, LucideAngularModule, ArsPipe, DatePipe],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  animations: [
    trigger('step', [
      transition(':enter', [style({ opacity: 0, transform: 'translateX(24px)' }), animate('380ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' }))]),
    ]),
    trigger('pop', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(.6)' }), animate('520ms cubic-bezier(.34,1.56,.64,1)', style({ opacity: 1, transform: 'none' }))]),
    ]),
  ],
})
export class CheckoutComponent implements OnDestroy {
  readonly cart = inject(CartService);
  private catalogo = inject(CatalogoService);
  readonly mp = inject(MercadoPagoService);
  private router = inject(Router);
  private zone = inject(NgZone);
  private fb = inject(FormBuilder);
  readonly i = I;

  readonly paso = signal<'datos' | 'pago' | 'resultado'>('datos');
  readonly pendiente = signal<PedidoPendiente | null>(this.leerPendiente());
  readonly brickListo = signal(false);
  readonly procesando = signal(false);
  readonly error = signal<{ titulo: string; mensaje: string } | null>(null);
  readonly resultado = signal<Resultado | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    telefono: ['', [Validators.required, Validators.maxLength(30), Validators.pattern(/^[0-9+()\-\s]{6,30}$/)]],
    direccion: ['', [Validators.required, Validators.maxLength(300)]],
  });

  /** Items y total que se muestran: los del pedido pendiente o los del carrito. */
  readonly items = computed(() => this.pendiente()?.items ?? this.cart.items());
  readonly total = computed(() => this.pendiente()?.total ?? this.cart.total());

  constructor() {
    const datos = this.leerDatosCliente();
    if (datos) this.form.patchValue(datos);

    if (this.pendiente()) {
      this.paso.set('pago');
      this.error.set({ titulo: 'Tenés un pago sin completar', mensaje: `Tu pedido #${this.pendiente()!.pedidoId} sigue esperando el pago. Podés reintentar con otra tarjeta.` });
      setTimeout(() => this.montarBrick());
    } else if (this.cart.vacio()) {
      this.router.navigate(['/carrito']);
    }
  }

  campoInvalido(nombre: 'nombre' | 'telefono' | 'direccion'): boolean {
    const c = this.form.controls[nombre];
    return c.invalid && (c.touched || c.dirty);
  }

  continuar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const primero = document.querySelector<HTMLElement>('.ng-invalid[formControlName]');
      primero?.focus();
      return;
    }
    try { sessionStorage.setItem('ce.datosCliente', JSON.stringify(this.form.getRawValue())); } catch { /* sin storage */ }
    this.error.set(null);
    this.paso.set('pago');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => this.montarBrick());
  }

  volverADatos(): void {
    this.mp.desmontar();
    this.paso.set('datos');
  }

  async montarBrick(): Promise<void> {
    if (!this.mp.configurado) return;
    this.brickListo.set(false);
    try {
      await this.mp.montar('brick-container', this.total(), {
        onListo: () => this.zone.run(() => this.brickListo.set(true)),
        onSubmit: pago => this.zone.run(() => this.pagar(pago)),
        onError: msg => this.zone.run(() => this.error.set({ titulo: 'Problema con el formulario de pago', mensaje: msg })),
      });
    } catch {
      this.error.set({ titulo: 'No pudimos cargar Mercado Pago', mensaje: 'Revisá tu conexión (o algún bloqueador de anuncios) y recargá la página.' });
    }
  }

  private async pagar(pago: DatosPago): Promise<void> {
    this.procesando.set(true);
    this.error.set(null);
    const pend = this.pendiente();

    try {
      if (pend) {
        const r = await firstValueFrom(this.catalogo.reintentarPago(pend.pedidoId, pend.tokenPago, pago));
        this.procesarResultado(r.pedidoId, r.total, r.fechaExpiracionReserva, r.pago, pend.tokenPago, pend.items);
      } else {
        const items = this.cart.items();
        const r = await firstValueFrom(this.catalogo.crearPedido({
          cliente: this.form.getRawValue(),
          items: items.map(i => ({ productoId: i.productoId, cantidadPacks: i.packs })),
          pago,
        }));
        this.procesarResultado(r.pedidoId, r.total, r.fechaExpiracionReserva, r.pago, r.tokenPago, items, r.items);
      }
    } catch (e) {
      this.manejarError(e);
    } finally {
      this.procesando.set(false);
    }
  }

  private procesarResultado(pedidoId: number, total: number, expira: string | null, pago: ResultadoPago, tokenPago: string, items: ItemCarrito[], itemsApi?: ItemPedidoCreado[]): void {
    const estado = clasificarPago(pago.estado, pago.statusDetail);

    if (estado === 'rechazado') {
      this.guardarPendiente({ pedidoId, tokenPago, total, expira, items });
      this.error.set({ titulo: 'El pago fue rechazado', mensaje: mensajeRechazo(pago.detalleTransaccion ?? pago.statusDetail) });
      this.montarBrick();
      return;
    }

    this.resultado.set({
      estado,
      pedidoId,
      total,
      items: itemsApi
        ? itemsApi.map(i => ({ nombre: i.nombre, packs: i.cantidadPacks, subtotal: i.subtotal }))
        : items.map(i => ({ nombre: i.nombre, packs: i.packs, subtotal: i.packs * i.precioPack })),
    });
    this.guardarPendiente(null);
    this.cart.vaciar();
    this.mp.desmontar();
    this.paso.set('resultado');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private manejarError(e: unknown): void {
    const pd = problem(e);
    const status = e instanceof HttpErrorResponse ? e.status : 0;

    // MP no respondió: el pedido quedó creado con stock reservado. Se reintenta con el mismo token.
    if (status === 502 && pd?.pedidoId && pd.tokenPago) {
      this.guardarPendiente({ pedidoId: pd.pedidoId, tokenPago: pd.tokenPago, total: this.total(), expira: null, items: this.items() });
      this.error.set({ titulo: 'Mercado Pago no respondió', mensaje: 'Tu pedido quedó reservado. Volvé a cargar la tarjeta para reintentar el pago.' });
      this.montarBrick();
      return;
    }

    if (pd?.code === 'STOCK_INSUFICIENTE' || pd?.code === 'PRODUCTO_INVALIDO') {
      this.error.set({ titulo: 'Cambió la disponibilidad', mensaje: mensajeError(e) + ' Revisá tu pedido y volvé a intentar.' });
      this.guardarPendiente(null);
      this.catalogo.productos({ pageSize: 100 }).subscribe(r => this.cart.sincronizar(r.items));
      this.mp.desmontar();
      return;
    }

    // Reintento sobre un pedido que ya venció o cambió de estado.
    if (this.pendiente() && (status === 409 || status === 404 || status === 422 || status === 401)) {
      this.guardarPendiente(null);
      this.error.set({ titulo: 'El pedido anterior venció', mensaje: mensajeError(e) + ' Armá el pedido de nuevo desde el carrito.' });
      this.mp.desmontar();
      return;
    }

    this.error.set({ titulo: 'No pudimos procesar el pago', mensaje: mensajeError(e) });
    this.montarBrick();
  }

  descartarPendiente(): void {
    this.guardarPendiente(null);
    this.error.set(null);
    this.mp.desmontar();
    this.paso.set('datos');
    if (this.cart.vacio()) this.router.navigate(['/carrito']);
  }

  private guardarPendiente(p: PedidoPendiente | null): void {
    this.pendiente.set(p);
    try {
      if (p) sessionStorage.setItem(KEY_PENDIENTE, JSON.stringify(p));
      else sessionStorage.removeItem(KEY_PENDIENTE);
    } catch { /* sin storage */ }
  }

  private leerPendiente(): PedidoPendiente | null {
    try {
      const raw = sessionStorage.getItem(KEY_PENDIENTE);
      if (!raw) return null;
      const p = JSON.parse(raw) as PedidoPendiente;
      // Pasado el vencimiento de la reserva el job cancela el pedido.
      if (p.expira && new Date(p.expira).getTime() < Date.now()) {
        sessionStorage.removeItem(KEY_PENDIENTE);
        return null;
      }
      return p;
    } catch {
      return null;
    }
  }

  private leerDatosCliente(): { nombre: string; telefono: string; direccion: string } | null {
    try {
      const raw = sessionStorage.getItem('ce.datosCliente');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  ngOnDestroy(): void {
    this.mp.desmontar();
  }
}
