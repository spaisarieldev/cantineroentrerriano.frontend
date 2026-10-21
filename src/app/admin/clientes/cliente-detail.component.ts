import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { ClienteDetalle, PedidoResumen } from '../../core/models';
import { mensajeError } from '../../core/http.utils';
import { ToastService } from '../../core/toast.service';
import { ArsPipe } from '../../shared/ars.pipe';
import { EstadoEnvioComponent, EstadoPedidoComponent } from '../../shared/badges.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-cliente-detail',
  imports: [RouterLink, DatePipe, LucideAngularModule, ArsPipe, EstadoPedidoComponent, EstadoEnvioComponent],
  template: `
    @if (cliente(); as c) {
      <div class="page-head">
        <div>
          <a routerLink="/admin/clientes" class="back"><lucide-icon [img]="i.ArrowLeft" [size]="16" /> Clientes</a>
          <h1>{{ c.nombre }}</h1>
          <p>DNI {{ c.dni }} · cliente desde {{ c.fechaCreacion | date: "MMMM 'de' yyyy" }}</p>
        </div>
      </div>

      <div class="grid-2">
        <section class="panel">
          <div class="panel-head"><h2>Pedidos</h2><span class="muted">{{ pedidos().length }}</span></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>#</th><th>Fecha</th><th>Estado</th><th>Envío</th><th class="num">Total</th></tr></thead>
              <tbody>
                @for (p of pedidos(); track p.id) {
                  <tr class="clickable" [routerLink]="['/admin/pedidos', p.id]">
                    <td><strong>#{{ p.id }}</strong></td>
                    <td>{{ p.fecha | date: 'dd/MM/yyyy' }}</td>
                    <td><app-estado-pedido [estado]="p.estado" /></td>
                    <td><app-estado-envio [estado]="p.estadoEnvio" /></td>
                    <td class="num"><strong>{{ p.total | ars }}</strong></td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted">Sin pedidos.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Historial de contacto</h2></div>
          <ol class="hist">
            @for (h of c.historico; track h.id; let first = $first) {
              <li [class.current]="first">
                <span class="when">{{ first ? 'Actual' : 'Desde' }} · {{ h.fechaDesde | date: 'dd/MM/yyyy' }}</span>
                <span><lucide-icon [img]="i.Phone" [size]="14" /> {{ h.telefono }}</span>
                <span><lucide-icon [img]="i.Mail" [size]="14" /> {{ h.email }}</span>
                <span><lucide-icon [img]="i.MapPin" [size]="14" /> {{ h.direccion }}</span>
              </li>
            }
          </ol>
        </section>
      </div>
    } @else {
      <div class="skeleton" style="height:40px;width:280px;margin-bottom:24px"></div>
      <div class="grid-2"><div class="skeleton" style="height:260px"></div><div class="skeleton" style="height:260px"></div></div>
    }
  `,
  styles: `
    .hist { list-style: none; margin: 0; padding: 8px 0; }
    .hist li { display: flex; flex-direction: column; gap: 4px; padding: 14px 20px; border-bottom: 1px solid var(--border); font-size: .92rem;
      &:last-child { border-bottom: 0; }
      span { display: flex; align-items: center; gap: 8px; word-break: break-word; } lucide-icon { color: var(--text-muted); flex-shrink: 0; }
      .when { font-size: .74rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); }
      &.current { background: #fcf6ee; box-shadow: inset 3px 0 0 var(--kumquat-500); .when { color: var(--kumquat-600); } } }
  `,
})
export class ClienteDetailComponent {
  readonly id = input.required<string>();
  private api = inject(PanelApiService);
  private toast = inject(ToastService);
  readonly i = I;
  readonly cliente = signal<ClienteDetalle | null>(null);
  readonly pedidos = signal<PedidoResumen[]>([]);

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.api.cliente(id).subscribe({
        next: c => {
          this.cliente.set(c);
          // La API filtra pedidos por nombre o DNI: buscamos por DNI y nos quedamos con los de este cliente.
          this.api.pedidos({ buscar: c.dni, pageSize: 100 }).subscribe({
            next: r => this.pedidos.set(r.items.filter(p => p.clienteId === c.id)),
            error: () => void 0,
          });
        },
        error: e => this.toast.error(mensajeError(e, 'No pudimos cargar el cliente.')),
      });
    });
  }
}
