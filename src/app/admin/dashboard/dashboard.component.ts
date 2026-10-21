import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { AuthService } from '../../core/auth.service';
import { PedidoResumen, Producto } from '../../core/models';
import { ArsPipe } from '../../shared/ars.pipe';
import { EstadoEnvioComponent, EstadoPedidoComponent } from '../../shared/badges.component';
import { I } from '../../shared/icons';

interface Kpi { titulo: string; valor: string; detalle: string; icono: LucideIconData; ruta: string; query: Record<string, string>; tono: 'berry' | 'kumquat' | 'danger' | 'wine'; }
interface Dia { fecha: Date; clave: string; total: number; pedidos: number; }

const DIAS = 14;

function claveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, LucideAngularModule, ArsPipe, EstadoPedidoComponent, EstadoEnvioComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private api = inject(PanelApiService);
  readonly auth = inject(AuthService);
  readonly i = I;

  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly kpis = signal<Kpi[]>([]);
  readonly dias = signal<Dia[]>([]);
  readonly recientes = signal<PedidoResumen[]>([]);
  readonly stockBajo = signal<Producto[]>([]);
  readonly hover = signal<number | null>(null);

  readonly maxDia = computed(() => Math.max(1, ...this.dias().map(d => d.total)));
  readonly totalPeriodo = computed(() => this.dias().reduce((a, d) => a + d.total, 0));
  readonly pedidosPeriodo = computed(() => this.dias().reduce((a, d) => a + d.pedidos, 0));
  /** Líneas de grilla: 0, 50% y 100% del máximo redondeado. */
  readonly escala = computed(() => {
    const max = this.maxDia();
    const paso = Math.pow(10, Math.floor(Math.log10(max)));
    const tope = Math.ceil(max / paso) * paso;
    return { tope, marcas: [tope, tope / 2, 0] };
  });

  readonly saludo = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  })();

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (DIAS - 1));
    const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

    forkJoin({
      despachar: this.api.pedidos({ estado: 'Pagado', estadoEnvio: 'NoDespachado', pageSize: 1 }),
      pendientes: this.api.pedidos({ estado: 'Pendiente', pageSize: 1 }),
      revision: this.api.pedidos({ requiereRevision: true, pageSize: 1 }),
      pagados: this.api.pedidos({ estado: 'Pagado', fechaDesde: claveDia(desde), fechaHasta: claveDia(manana), pageSize: 100 }),
      recientes: this.api.pedidos({ pageSize: 6, orderBy: 'fecha', orderDir: 'desc' }),
      stock: this.api.productos({ activo: true, orderBy: 'stock', orderDir: 'asc', pageSize: 5 }),
    }).subscribe({
      next: r => {
        // Serie diaria de pedidos pagados (por fecha del pedido).
        const mapa = new Map<string, Dia>();
        for (let k = 0; k < DIAS; k++) {
          const f = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + k);
          mapa.set(claveDia(f), { fecha: f, clave: claveDia(f), total: 0, pedidos: 0 });
        }
        for (const p of r.pagados.items) {
          const d = mapa.get(claveDia(new Date(p.fecha)));
          if (d) { d.total += p.total; d.pedidos++; }
        }
        this.dias.set([...mapa.values()]);

        this.kpis.set([
          { titulo: 'Para despachar', valor: String(r.despachar.total), detalle: 'Pagados sin despachar', icono: I.Truck, ruta: '/admin/pedidos', query: { estado: 'Pagado', estadoEnvio: 'NoDespachado' }, tono: 'berry' },
          { titulo: 'Esperando pago', valor: String(r.pendientes.total), detalle: 'Pedidos pendientes', icono: I.Clock, ruta: '/admin/pedidos', query: { estado: 'Pendiente' }, tono: 'kumquat' },
          { titulo: 'Requieren revisión', valor: String(r.revision.total), detalle: 'Cancelados con pago aprobado', icono: I.AlertTriangle, ruta: '/admin/pedidos', query: { requiereRevision: 'true' }, tono: 'danger' },
          { titulo: `Vendido en ${DIAS} días`, valor: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(this.totalPeriodo()), detalle: `${this.pedidosPeriodo()} pedidos pagados`, icono: I.CircleDollarSign, ruta: '/admin/pedidos', query: { estado: 'Pagado' }, tono: 'wine' },
        ]);
        this.recientes.set(r.recientes.items);
        this.stockBajo.set(r.stock.items);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  altura(total: number): number {
    return (total / this.escala().tope) * 100;
  }
}
