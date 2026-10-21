import { Component, computed, input } from '@angular/core';
import { EstadoEnvio, EstadoPedido } from '../core/models';

@Component({
  selector: 'app-estado-pedido',
  template: `<span [class]="'badge ' + clase()">{{ estado() }}</span>`,
})
export class EstadoPedidoComponent {
  readonly estado = input.required<EstadoPedido>();
  readonly clase = computed(() => ({
    Pendiente: 'badge-warning',
    Pagado: 'badge-success',
    Cancelado: 'badge-neutral',
    Reembolsado: 'badge-info',
  })[this.estado()]);
}

@Component({
  selector: 'app-estado-envio',
  template: `<span [class]="'badge ' + (estado() === 'Despachado' ? 'badge-info' : 'badge-neutral')">{{ estado() === 'Despachado' ? 'Despachado' : 'No despachado' }}</span>`,
})
export class EstadoEnvioComponent {
  readonly estado = input.required<EstadoEnvio>();
}

/** Estado de un intento de pago tal cual Mercado Pago. */
@Component({
  selector: 'app-estado-pago',
  template: `<span [class]="'badge ' + info().clase" [title]="estado()">{{ info().texto }}</span>`,
})
export class EstadoPagoComponent {
  readonly estado = input.required<string>();
  readonly info = computed(() => {
    switch (this.estado()) {
      case 'processed': return { texto: 'Aprobado', clase: 'badge-success' };
      case 'processing':
      case 'action_required': return { texto: 'En revisión', clase: 'badge-warning' };
      case 'failed': return { texto: 'Rechazado', clase: 'badge-danger' };
      case 'expired':
      case 'canceled': return { texto: 'Vencido', clase: 'badge-neutral' };
      case 'refunded': return { texto: 'Reembolsado', clase: 'badge-info' };
      default: return { texto: this.estado(), clase: 'badge-neutral' };
    }
  });
}

@Component({
  selector: 'app-activo-badge',
  template: `<span [class]="'badge ' + (activo() ? 'badge-success' : 'badge-neutral')">{{ activo() ? 'Activo' : 'Inactivo' }}</span>`,
})
export class ActivoBadgeComponent {
  readonly activo = input.required<boolean>();
}
