import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { EstadoEnvio, EstadoPedido, PedidoDetalle } from '../../core/models';
import { mensajeError } from '../../core/http.utils';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../shared/confirm.service';
import { ArsPipe } from '../../shared/ars.pipe';
import { EstadoEnvioComponent, EstadoPagoComponent, EstadoPedidoComponent } from '../../shared/badges.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-pedido-detail',
  imports: [RouterLink, DatePipe, LucideAngularModule, ArsPipe, EstadoPedidoComponent, EstadoEnvioComponent, EstadoPagoComponent, EmptyStateComponent],
  template: `
    @if (cargando() && !pedido()) {
      <div class="skeleton" style="height:40px;width:260px;margin-bottom:24px"></div>
      <div class="grid-2"><div class="skeleton" style="height:320px"></div><div class="skeleton" style="height:320px"></div></div>
    } @else if (noEncontrado()) {
      <app-empty-state [icono]="i.Receipt" titulo="Pedido no encontrado" mensaje="Puede que el número no exista.">
        <a routerLink="/admin/pedidos" class="btn">Volver a pedidos</a>
      </app-empty-state>
    } @else if (pedido()) { @let p = pedido()!;
      <div class="page-head">
        <div>
          <a routerLink="/admin/pedidos" class="back"><lucide-icon [img]="i.ArrowLeft" [size]="16" /> Pedidos</a>
          <h1>Pedido #{{ p.id }}</h1>
          <div class="row badges">
            <app-estado-pedido [estado]="p.estado" />
            <app-estado-envio [estado]="p.estadoEnvio" />
            <span class="muted">{{ p.fecha | date: "d 'de' MMMM yyyy, HH:mm" }}</span>
          </div>
        </div>
        <div class="row">
          @if (p.estadoEnvio === 'NoDespachado') {
            <button type="button" class="btn btn-primary" [disabled]="p.estado !== 'Pagado' || accion()" (click)="cambiarEnvio('Despachado')"
              [title]="p.estado !== 'Pagado' ? 'Solo se puede despachar un pedido pagado' : ''">
              <lucide-icon [img]="i.Truck" [size]="18" /> Marcar despachado
            </button>
          } @else {
            <button type="button" class="btn" [disabled]="accion()" (click)="cambiarEnvio('NoDespachado')"><lucide-icon [img]="i.Undo2" [size]="18" /> Marcar no despachado</button>
          }
          @if (p.estado === 'Pagado') {
            <button type="button" class="btn" [disabled]="accion()" (click)="cambiarEstado('Reembolsado')"><lucide-icon [img]="i.Undo2" [size]="18" /> Reembolsado</button>
            <button type="button" class="btn btn-ghost danger" [disabled]="accion()" (click)="cambiarEstado('Cancelado')"><lucide-icon [img]="i.Ban" [size]="18" /> Cancelar</button>
          }
        </div>
      </div>

      @if (p.requiereRevision) {
        <div class="alert alert-danger" role="alert">
          <lucide-icon [img]="i.AlertTriangle" [size]="20" />
          <p><strong>Requiere revisión</strong>El pedido se canceló pero tiene un pago aprobado en Mercado Pago. Revisalo y, si corresponde, hacé el reembolso desde Mercado Pago.</p>
        </div>
      }
      @if (p.estado === 'Pendiente' && p.fechaExpiracionReserva) {
        <div class="alert alert-warning">
          <lucide-icon [img]="i.Clock" [size]="20" />
          <p><strong>Esperando el pago</strong>
            {{ p.reservaActiva ? 'El stock está reservado' : 'El stock no está reservado (último pago rechazado)' }} hasta las {{ p.fechaExpiracionReserva | date: 'HH:mm' }} del {{ p.fechaExpiracionReserva | date: 'dd/MM' }}. Si no se paga, se cancela solo.</p>
        </div>
      }

      <div class="grid-2">
        <section class="panel">
          <div class="panel-head"><h2>Productos</h2><span class="muted">{{ p.items.length }} {{ p.items.length === 1 ? 'producto' : 'productos' }}</span></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Producto</th><th class="num">Packs</th><th class="num">Unidades</th><th class="num">Precio unit.</th><th class="num">Subtotal</th></tr></thead>
              <tbody>
                @for (it of p.items; track it.id) {
                  <tr>
                    <td><a [routerLink]="['/admin/productos', it.productoId]" class="plink">{{ it.productoNombre }}</a></td>
                    <td class="num">{{ it.packs }} <small class="muted">x{{ it.unidadesPorPack }}</small></td>
                    <td class="num">{{ it.cantidad }}</td>
                    <td class="num">{{ it.precioUnitario | ars }}</td>
                    <td class="num"><strong>{{ it.subtotal | ars }}</strong></td>
                  </tr>
                }
              </tbody>
              <tfoot><tr><td colspan="4" class="num"><strong>Total</strong></td><td class="num total">{{ p.total | ars }}</td></tr></tfoot>
            </table>
          </div>
        </section>

        <div class="stack-col">
          <section class="panel">
            <div class="panel-head"><h2>Cliente</h2><a [routerLink]="['/admin/clientes', p.cliente.id]" class="small">Ver ficha</a></div>
            <div class="panel-body">
              <div class="client">
                <span class="avatar">{{ p.cliente.nombre.charAt(0) }}</span>
                <div><strong>{{ p.cliente.nombre }}</strong><small>DNI {{ p.cliente.dni }}</small></div>
              </div>
              <ul class="contact">
                <li><lucide-icon [img]="i.Phone" [size]="16" /><a [href]="'tel:' + p.contacto.telefono">{{ p.contacto.telefono }}</a></li>
                <li><lucide-icon [img]="i.Mail" [size]="16" /><a [href]="'mailto:' + p.contacto.email">{{ p.contacto.email }}</a></li>
                <li><lucide-icon [img]="i.MapPin" [size]="16" /><span>{{ p.contacto.direccion }}</span></li>
              </ul>
              <p class="note muted">Datos de contacto vigentes al momento de esta compra.</p>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><h2>Intentos de pago</h2><span class="muted">{{ p.pagos.length }}</span></div>
            @if (p.pagos.length === 0) {
              <p class="panel-body muted">Sin intentos de pago registrados.</p>
            } @else {
              <ol class="timeline">
                @for (pg of p.pagos; track pg.id) {
                  <li>
                    <div class="t-head"><app-estado-pago [estado]="pg.estado" /><strong>{{ pg.monto | ars }}</strong></div>
                    <span class="muted small">{{ pg.fecha | date: 'dd/MM/yyyy HH:mm' }}</span>
                    @if (pg.mpStatusDetail) { <code>{{ pg.mpStatusDetail }}</code> }
                    @if (pg.mpOrderId) { <span class="muted small mono">Order {{ pg.mpOrderId }}</span> }
                  </li>
                }
              </ol>
            }
          </section>
        </div>
      </div>
    }
  `,
  styles: `
    .badges { margin-top: 8px; gap: 8px; }
    .alert { margin-bottom: 16px; }
    .danger { color: var(--danger); &:hover:not(:disabled) { background: var(--danger-bg); } }
    .plink { font-weight: 700; color: var(--ink-900); text-decoration: none; &:hover { color: var(--primary); } }
    tfoot td { padding: 14px 16px; border-top: 1px solid var(--border); }
    .total { font-size: 1.25rem; font-weight: 700; }
    .stack-col { display: flex; flex-direction: column; gap: 20px; }
    .small { font-size: .85rem; font-weight: 700; }
    .client { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; strong { display: block; } small { color: var(--text-muted); } }
    .avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--kumquat-100); color: var(--kumquat-600); display: grid; place-items: center; font-weight: 700; font-size: 1.1rem; }
    .contact { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px;
      li { display: flex; gap: 10px; align-items: flex-start; lucide-icon { color: var(--text-muted); margin-top: 3px; flex-shrink: 0; } }
      a { color: var(--ink-900); font-weight: 600; word-break: break-all; } }
    .note { font-size: .8rem; margin: 14px 0 0; }
    .timeline { list-style: none; margin: 0; padding: 16px 20px 16px 36px; position: relative;
      &::before { content: ''; position: absolute; left: 22px; top: 22px; bottom: 22px; width: 2px; background: var(--border); }
      li { position: relative; display: flex; flex-direction: column; gap: 4px; padding-bottom: 18px;
        &::before { content: ''; position: absolute; left: -19px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--surface); border: 2px solid var(--primary); }
        &:last-child { padding-bottom: 0; } }
      .t-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      code { font-size: .78rem; background: var(--surface-2); padding: 2px 6px; border-radius: 4px; align-self: flex-start; }
      .mono { font-family: ui-monospace, monospace; font-size: .75rem; word-break: break-all; } }
  `,
})
export class PedidoDetailComponent {
  readonly id = input.required<string>();
  private api = inject(PanelApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly i = I;

  readonly pedido = signal<PedidoDetalle | null>(null);
  readonly cargando = signal(true);
  readonly noEncontrado = signal(false);
  readonly accion = signal(false);

  constructor() {
    effect(() => this.cargar(Number(this.id())));
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.api.pedido(id).subscribe({
      next: p => { this.pedido.set(p); this.cargando.set(false); },
      error: e => {
        this.cargando.set(false);
        if (e.status === 404) this.noEncontrado.set(true);
        else this.toast.error(mensajeError(e));
      },
    });
  }

  cambiarEnvio(estado: EstadoEnvio): void {
    const p = this.pedido()!;
    this.accion.set(true);
    this.api.estadoEnvio(p.id, estado).subscribe({
      next: r => {
        this.pedido.set(r);
        this.accion.set(false);
        this.toast.exito(estado === 'Despachado' ? `Pedido #${p.id} marcado como despachado.` : `Pedido #${p.id} marcado como no despachado.`);
      },
      error: e => { this.accion.set(false); this.toast.error(mensajeError(e)); },
    });
  }

  async cambiarEstado(estado: EstadoPedido): Promise<void> {
    const p = this.pedido()!;
    const ok = await this.confirm.preguntar(estado === 'Cancelado'
      ? { titulo: `¿Cancelar el pedido #${p.id}?`, mensaje: 'Solo cambia el estado: no devuelve el dinero (se hace desde Mercado Pago) ni el stock (si la mercadería vuelve, cargá un ajuste de stock). No se puede deshacer.', confirmar: 'Sí, cancelar', peligro: true }
      : { titulo: `¿Marcar el pedido #${p.id} como reembolsado?`, mensaje: 'Usalo cuando el reembolso no llegó solo desde Mercado Pago. No devuelve el stock ni se puede deshacer.', confirmar: 'Marcar reembolsado', peligro: true });
    if (!ok) return;
    this.accion.set(true);
    this.api.estadoPedido(p.id, estado).subscribe({
      next: r => { this.pedido.set(r); this.accion.set(false); this.toast.exito(`Pedido #${p.id} ${estado === 'Cancelado' ? 'cancelado' : 'marcado como reembolsado'}.`); },
      error: e => { this.accion.set(false); this.toast.error(mensajeError(e)); },
    });
  }
}
