import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { Catalogo, GuardarProducto, MotivoStock, MovimientoStockHistorial, Paginado, Producto, ProductoFoto } from '../../core/models';
import { erroresPorCampo, mensajeError, urlArchivo } from '../../core/http.utils';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../shared/confirm.service';
import { ArsPipe } from '../../shared/ars.pipe';
import { ActivoBadgeComponent } from '../../shared/badges.component';
import { PaginationComponent } from '../../shared/pagination.component';
import { I } from '../../shared/icons';

const MAX_FOTOS = 8;
const MAX_MB = 10;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, DatePipe, LucideAngularModule, ArsPipe, ActivoBadgeComponent, PaginationComponent],
  templateUrl: './producto-form.component.html',
  styleUrl: './producto-form.component.scss',
  animations: [
    trigger('foto', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(.9)' }), animate('260ms cubic-bezier(.22,1,.36,1)', style({ opacity: 1, transform: 'none' }))]),
      transition(':leave', [animate('180ms ease-in', style({ opacity: 0, transform: 'scale(.9)' }))]),
    ]),
  ],
})
export class ProductoFormComponent {
  readonly id = input<string>();
  private api = inject(PanelApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(FormBuilder);
  readonly i = I;
  readonly maxFotos = MAX_FOTOS;

  readonly esNuevo = computed(() => !this.id());
  readonly producto = signal<Producto | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errores = signal<Record<string, string>>({});
  readonly marcas = signal<Catalogo[]>([]);
  readonly variantes = signal<Catalogo[]>([]);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    descripcion: this.fb.control<string | null>(null),
    marcaId: this.fb.control<number | null>(null, Validators.required),
    varianteId: this.fb.control<number | null>(null),
    precioUnitario: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    unidadesPorPack: this.fb.control<number | null>(6, [Validators.required, Validators.min(1)]),
    stockInicial: this.fb.control<number | null>(0, [Validators.min(0)]),
  });

  readonly precioPack = signal(0);

  /* Fotos */
  readonly fotos = computed(() => [...(this.producto()?.fotos ?? [])].sort((a, b) => a.orden - b.orden));
  readonly subiendo = signal(0);
  readonly arrastrando = signal(false);
  readonly placeholders = computed(() => Array.from({ length: this.subiendo() }));
  readonly sinPrincipal = computed(() => this.fotos().length > 0 && !this.fotos().some(f => f.principal));

  /* Stock */
  readonly motivos = signal<MotivoStock[]>([]);
  readonly movimientos = signal<Paginado<MovimientoStockHistorial> | null>(null);
  readonly movPage = signal(1);
  readonly movMotivo = signal<number | null>(null);
  readonly ajuste = signal<{ tipo: 'ingreso' | 'egreso'; cantidad: number | null; motivoId: number | null }>({ tipo: 'ingreso', cantidad: null, motivoId: null });
  readonly ajustando = signal(false);
  readonly errorAjuste = signal<string | null>(null);
  readonly motivosManuales = computed(() => this.motivos().filter(m => !m.esSistema && m.activo));

  constructor() {
    this.api.catalogo('marcas', { pageSize: 100, orderBy: 'nombre' }).subscribe({ next: r => this.marcas.set(r.items), error: () => void 0 });
    this.api.catalogo('variantes', { pageSize: 100, orderBy: 'nombre' }).subscribe({ next: r => this.variantes.set(r.items), error: () => void 0 });

    this.form.valueChanges.subscribe(v => this.precioPack.set((Number(v.precioUnitario) || 0) * (Number(v.unidadesPorPack) || 0)));
    this.precioPack.set(0);

    effect(() => {
      const id = this.id();
      if (id) this.cargar(Number(id));
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.api.producto(id).subscribe({
      next: p => {
        this.producto.set(p);
        this.form.patchValue({
          nombre: p.nombre, descripcion: p.descripcion, marcaId: p.marcaId, varianteId: p.varianteId,
          precioUnitario: p.precioUnitario, unidadesPorPack: p.unidadesPorPack,
        });
        this.cargando.set(false);
        this.cargarMovimientos();
        if (!this.motivos().length) {
          this.api.motivos({ pageSize: 100, orderBy: 'nombre' }).subscribe({ next: r => this.motivos.set(r.items), error: () => void 0 });
        }
      },
      error: e => {
        this.cargando.set(false);
        this.toast.error(mensajeError(e, 'No pudimos cargar el producto.'));
        this.router.navigate(['/admin/productos']);
      },
    });
  }

  /* ---------- Datos ---------- */
  invalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body: GuardarProducto = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || null,
      marcaId: v.marcaId,
      varianteId: v.varianteId,
      precioUnitario: v.precioUnitario,
      unidadesPorPack: v.unidadesPorPack,
    };
    if (this.esNuevo()) body.stockInicial = v.stockInicial ?? 0;

    this.guardando.set(true);
    this.errores.set({});
    const req = this.esNuevo() ? this.api.crearProducto(body) : this.api.editarProducto(this.producto()!.id, body);
    req.subscribe({
      next: p => {
        this.guardando.set(false);
        this.form.markAsPristine();
        if (this.esNuevo()) {
          this.toast.exito('Ahora podés agregarle fotos.', 'Producto creado');
          this.router.navigate(['/admin/productos', p.id]);
        } else {
          this.producto.set(p);
          this.toast.exito('Cambios guardados.');
        }
      },
      error: e => {
        this.guardando.set(false);
        this.errores.set(erroresPorCampo(e));
        this.toast.error(mensajeError(e));
      },
    });
  }

  async toggleActivo(): Promise<void> {
    const p = this.producto()!;
    if (p.activo && !(await this.confirm.preguntar({ titulo: '¿Desactivar el producto?', mensaje: 'Deja de mostrarse en la tienda.', confirmar: 'Desactivar', peligro: true }))) return;
    this.api.activoProducto(p.id, !p.activo).subscribe({
      next: r => { this.producto.set(r); this.toast.exito(r.activo ? 'Producto activado.' : 'Producto desactivado.'); },
      error: e => this.toast.error(mensajeError(e)),
    });
  }

  /* ---------- Fotos ---------- */
  url(f: ProductoFoto): string {
    return urlArchivo(f.ruta)!;
  }

  onArchivos(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.subir(Array.from(input.files ?? []));
    input.value = '';
  }

  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.arrastrando.set(false);
    this.subir(Array.from(ev.dataTransfer?.files ?? []));
  }

  private async subir(archivos: File[]): Promise<void> {
    const p = this.producto();
    if (!p || !archivos.length) return;
    const lugar = MAX_FOTOS - p.fotos.length;
    if (lugar <= 0) { this.toast.error(`Máximo ${MAX_FOTOS} fotos por producto.`); return; }
    if (archivos.length > lugar) this.toast.info(`Solo se suben ${lugar} de ${archivos.length}: el máximo es ${MAX_FOTOS} fotos.`);

    for (const f of archivos.slice(0, lugar)) {
      if (!TIPOS.includes(f.type)) { this.toast.error(`“${f.name}”: solo JPG, PNG o WEBP.`); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { this.toast.error(`“${f.name}” pesa más de ${MAX_MB} MB.`); continue; }
      this.subiendo.update(n => n + 1);
      await new Promise<void>(resolve => {
        this.api.subirFoto(p.id, f).subscribe({
          next: foto => {
            this.producto.update(x => x && { ...x, fotos: [...x.fotos, foto] });
            this.subiendo.update(n => n - 1);
            resolve();
          },
          error: e => { this.toast.error(mensajeError(e)); this.subiendo.update(n => n - 1); resolve(); },
        });
      });
    }
  }

  marcarPrincipal(f: ProductoFoto): void {
    this.api.fotoPrincipal(this.producto()!.id, f.id).subscribe({
      next: fotos => { this.producto.update(x => x && { ...x, fotos }); this.toast.exito('Foto principal actualizada.'); },
      error: e => this.toast.error(mensajeError(e)),
    });
  }

  async eliminarFoto(f: ProductoFoto): Promise<void> {
    if (!(await this.confirm.preguntar({ titulo: '¿Eliminar la foto?', mensaje: f.principal ? 'Es la foto principal: el producto va a quedar sin principal.' : 'Se borra definitivamente.', confirmar: 'Eliminar', peligro: true }))) return;
    this.api.eliminarFoto(this.producto()!.id, f.id).subscribe({
      next: () => this.producto.update(x => x && { ...x, fotos: x.fotos.filter(y => y.id !== f.id) }),
      error: e => this.toast.error(mensajeError(e)),
    });
  }

  mover(index: number, delta: number): void {
    const lista = this.fotos().map(f => f.id);
    const destino = index + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[index], lista[destino]] = [lista[destino], lista[index]];
    this.api.ordenarFotos(this.producto()!.id, lista).subscribe({
      next: fotos => this.producto.update(x => x && { ...x, fotos }),
      error: e => this.toast.error(mensajeError(e)),
    });
  }

  /* ---------- Stock ---------- */
  cargarMovimientos(): void {
    const p = this.producto();
    if (!p) return;
    this.api.movimientos(p.id, { page: this.movPage(), pageSize: 10, motivoId: this.movMotivo() }).subscribe({
      next: r => this.movimientos.set(r),
      error: e => this.toast.error(mensajeError(e)),
    });
  }

  setAjuste(cambio: Partial<{ tipo: 'ingreso' | 'egreso'; cantidad: number | null; motivoId: number | null }>): void {
    this.ajuste.update(a => ({ ...a, ...cambio }));
    this.errorAjuste.set(null);
  }

  aplicarAjuste(): void {
    const a = this.ajuste();
    const p = this.producto()!;
    if (!a.motivoId) { this.errorAjuste.set('Elegí un motivo.'); return; }
    if (!a.cantidad || a.cantidad <= 0 || !Number.isInteger(a.cantidad)) { this.errorAjuste.set('Ingresá una cantidad entera mayor a 0.'); return; }
    if (a.tipo === 'egreso' && a.cantidad > p.stock) { this.errorAjuste.set(`No podés descontar más que el stock actual (${p.stock}).`); return; }

    const cantidad = a.tipo === 'ingreso' ? a.cantidad : -a.cantidad;
    this.ajustando.set(true);
    this.api.crearMovimiento(p.id, a.motivoId, cantidad).subscribe({
      next: r => {
        this.ajustando.set(false);
        this.producto.update(x => x && { ...x, stock: r.stockResultante, packsDisponibles: Math.floor(r.stockResultante / x.unidadesPorPack) });
        this.ajuste.set({ tipo: a.tipo, cantidad: null, motivoId: a.motivoId });
        this.toast.exito(`Stock actualizado: ${r.stockResultante} unidades.`);
        this.movPage.set(1);
        this.cargarMovimientos();
      },
      error: e => { this.ajustando.set(false); this.errorAjuste.set(mensajeError(e)); },
    });
  }
}
