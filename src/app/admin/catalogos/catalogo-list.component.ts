import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService, RecursoCatalogo } from '../../core/panel-api.service';
import { Catalogo, MotivoStock, Paginado } from '../../core/models';
import { erroresPorCampo, mensajeError } from '../../core/http.utils';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PaginationComponent } from '../../shared/pagination.component';
import { ActivoBadgeComponent } from '../../shared/badges.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { I } from '../../shared/icons';

const TEXTOS: Record<RecursoCatalogo, { titulo: string; singular: string; nuevo: string; desc: string; ejemplo: string }> = {
  marcas: { titulo: 'Marcas', singular: 'marca', nuevo: 'Nueva marca', desc: 'Las líneas de productos: cócteles, Bolazo, refrescos, Kumquat…', ejemplo: 'Ej: Bolazo' },
  variantes: { titulo: 'Variantes', singular: 'variante', nuevo: 'Nueva variante', desc: 'Atributos opcionales de los productos (sabor, tamaño, presentación).', ejemplo: 'Ej: Frutos rojos' },
  'motivos-stock': { titulo: 'Motivos de stock', singular: 'motivo', nuevo: 'Nuevo motivo', desc: 'Razones de los ajustes manuales de stock. Los del sistema no se pueden editar.', ejemplo: 'Ej: Venta feria' },
};

type Fila = Catalogo & Partial<Pick<MotivoStock, 'esSistema'>>;

@Component({
  selector: 'app-catalogo-list',
  imports: [FormsModule, DatePipe, LucideAngularModule, PaginationComponent, ActivoBadgeComponent, EmptyStateComponent],
  animations: [
    trigger('modal', [
      transition(':enter', [style({ opacity: 0 }), animate('180ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('140ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
  template: `
    <div class="page-head">
      <div><h1>{{ t().titulo }}</h1><p>{{ t().desc }}</p></div>
      <button type="button" class="btn btn-primary" (click)="abrir()"><lucide-icon [img]="i.Plus" [size]="18" /> {{ t().nuevo }}</button>
    </div>

    <section class="panel">
      <div class="filters">
        @if (recurso() !== 'motivos-stock') {
          <div class="input-icon">
            <lucide-icon [img]="i.Search" [size]="18" />
            <input class="input" type="search" placeholder="Buscar por nombre…" aria-label="Buscar por nombre" [ngModel]="texto()" (ngModelChange)="onBuscar($event)" />
          </div>
        }
        <select class="select" aria-label="Estado" [ngModel]="activo()" (ngModelChange)="activo.set($event); cargar(1)">
          <option [ngValue]="null">Activos e inactivos</option>
          <option [ngValue]="true">Solo activos</option>
          <option [ngValue]="false">Solo inactivos</option>
        </select>
      </div>

      @if (error()) {
        <div class="panel-body"><div class="alert alert-danger" style="margin:0"><lucide-icon [img]="i.AlertCircle" [size]="20" /><p>{{ error() }}</p></div></div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Nombre</th><th>Estado</th><th>Creado</th><th></th></tr></thead>
            <tbody>
              @if (cargando() && !datos()) {
                @for (s of [1, 2, 3]; track s) { <tr class="table-skel"><td colspan="4"><div class="skeleton"></div></td></tr> }
              } @else {
                @for (f of datos()?.items ?? []; track f.id) {
                  <tr [class.inactive]="!f.activo">
                    <td><strong>{{ f.nombre }}</strong> @if (f.esSistema) { <span class="badge badge-info no-dot"><lucide-icon [img]="i.Lock" [size]="11" /> Sistema</span> }</td>
                    <td><app-activo-badge [activo]="f.activo" /></td>
                    <td class="muted">{{ f.fechaCreacion | date: 'dd/MM/yyyy' }}</td>
                    <td class="actions">
                      @if (!f.esSistema) {
                        <button type="button" class="icon-btn" (click)="abrir(f)" [attr.aria-label]="'Editar ' + f.nombre" title="Editar"><lucide-icon [img]="i.Pencil" [size]="18" /></button>
                        <button type="button" class="icon-btn" (click)="toggle(f)" [attr.aria-label]="(f.activo ? 'Desactivar ' : 'Activar ') + f.nombre" [title]="f.activo ? 'Desactivar' : 'Activar'"><lucide-icon [img]="i.Power" [size]="18" /></button>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (datos()?.items?.length === 0) {
          <app-empty-state [icono]="i.Tags" [titulo]="'No hay ' + t().titulo.toLowerCase()" mensaje="Creá el primero con el botón de arriba." />
        }
        @if (datos(); as d) {
          <div class="panel-foot"><app-pagination [page]="d.page" [pageSize]="d.pageSize" [total]="d.total" (cambiar)="cargar($event)" /></div>
        }
      }
    </section>

    @if (editando(); as e) {
      <div class="modal-backdrop" @modal (click)="cerrar()"></div>
      <form class="modal" @modal role="dialog" aria-modal="true" aria-labelledby="m-title" (ngSubmit)="guardar()" (keydown.escape)="cerrar()">
        <h2 id="m-title">{{ e.id ? 'Editar ' + t().singular : t().nuevo }}</h2>
        <div class="field">
          <label for="m-nombre">Nombre</label>
          <input #nombreInput id="m-nombre" name="nombre" class="input" [ngModel]="nombre()" (ngModelChange)="nombre.set($event); errorModal.set(null)" maxlength="100" [placeholder]="t().ejemplo" />
          @if (errorModal()) { <span class="error">{{ errorModal() }}</span> }
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" (click)="cerrar()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">
            @if (guardando()) { <span class="spinner"></span> } Guardar
          </button>
        </div>
      </form>
    }
  `,
  styles: `.inactive td:not(.actions) { opacity: .6; } .badge lucide-icon { margin-right: 2px; }`,
})
export class CatalogoListComponent {
  private api = inject(PanelApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly i = I;

  readonly recurso = signal<RecursoCatalogo>(inject(ActivatedRoute).snapshot.data['recurso']);
  readonly t = computed(() => TEXTOS[this.recurso()]);

  readonly datos = signal<Paginado<Fila> | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly texto = signal('');
  readonly activo = signal<boolean | null>(null);

  readonly editando = signal<{ id: number | null } | null>(null);
  readonly nombre = signal('');
  readonly guardando = signal(false);
  readonly errorModal = signal<string | null>(null);
  private nombreInput = viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  private carga$ = new Subject<number>();
  private busqueda$ = new Subject<string>();

  constructor() {
    const destroy = inject(DestroyRef);
    this.carga$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(null); }),
      switchMap(page => this.api.catalogo<Fila>(this.recurso(), { page, pageSize: 20, orderBy: 'nombre', orderDir: 'asc', activo: this.activo(), buscar: this.texto().trim() || undefined })
        .pipe(catchError(e => { this.error.set(mensajeError(e)); return of(null); }))),
      takeUntilDestroyed(destroy),
    ).subscribe(r => { this.cargando.set(false); if (r) this.datos.set(r); });
    this.busqueda$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroy)).subscribe(() => this.cargar(1));
    this.cargar(1);
  }

  cargar(page: number): void { this.carga$.next(page); }

  onBuscar(t: string): void {
    this.texto.set(t);
    this.busqueda$.next(t.trim());
  }

  abrir(f?: Fila): void {
    this.editando.set({ id: f?.id ?? null });
    this.nombre.set(f?.nombre ?? '');
    this.errorModal.set(null);
    setTimeout(() => this.nombreInput()?.nativeElement.focus());
  }

  cerrar(): void {
    this.editando.set(null);
  }

  guardar(): void {
    const nombre = this.nombre().trim();
    if (!nombre) { this.errorModal.set('El nombre es obligatorio.'); return; }
    const id = this.editando()!.id;
    this.guardando.set(true);
    const req = id ? this.api.editarCatalogo(this.recurso(), id, nombre) : this.api.crearCatalogo(this.recurso(), nombre);
    req.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrar();
        this.toast.exito(id ? 'Cambios guardados.' : `Se creó “${nombre}”.`);
        this.cargar(this.datos()?.page ?? 1);
      },
      error: e => {
        this.guardando.set(false);
        this.errorModal.set(erroresPorCampo(e)['nombre'] ?? mensajeError(e));
      },
    });
  }

  async toggle(f: Fila): Promise<void> {
    if (f.activo) {
      const ok = await this.confirm.preguntar({
        titulo: `¿Desactivar “${f.nombre}”?`,
        mensaje: this.recurso() === 'motivos-stock' ? 'No se va a poder elegir en nuevos ajustes de stock.' : 'No se va a poder elegir en productos nuevos y deja de aparecer en los filtros de la tienda.',
        confirmar: 'Desactivar',
        peligro: true,
      });
      if (!ok) return;
    }
    this.api.activoCatalogo<Fila>(this.recurso(), f.id, !f.activo).subscribe({
      next: r => {
        this.datos.update(d => d && { ...d, items: d.items.map(x => (x.id === r.id ? r : x)) });
        this.toast.exito(r.activo ? `“${r.nombre}” activado.` : `“${r.nombre}” desactivado.`);
      },
      error: e => this.toast.error(mensajeError(e)),
    });
  }
}
