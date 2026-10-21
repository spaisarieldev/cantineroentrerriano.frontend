import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { AuthService } from '../../core/auth.service';
import { Paginado, Rol, Usuario } from '../../core/models';
import { erroresPorCampo, mensajeError } from '../../core/http.utils';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PaginationComponent } from '../../shared/pagination.component';
import { ActivoBadgeComponent } from '../../shared/badges.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, FormsModule, DatePipe, LucideAngularModule, PaginationComponent, ActivoBadgeComponent],
  animations: [
    trigger('modal', [
      transition(':enter', [style({ opacity: 0 }), animate('180ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('140ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
  template: `
    <div class="page-head">
      <div><h1>Usuarios</h1><p>Quién puede entrar al panel. Admin y SuperAdmin tienen los mismos permisos, salvo esta sección.</p></div>
      <button type="button" class="btn btn-primary" (click)="abrir()"><lucide-icon [img]="i.Plus" [size]="18" /> Nuevo usuario</button>
    </div>

    <section class="panel">
      <div class="filters">
        <select class="select" aria-label="Rol" [ngModel]="rol()" (ngModelChange)="rol.set($event); cargar(1)">
          <option [ngValue]="null">Todos los roles</option>
          <option value="Admin">Admin</option>
          <option value="SuperAdmin">SuperAdmin</option>
        </select>
        <select class="select" aria-label="Estado" [ngModel]="activo()" (ngModelChange)="activo.set($event); cargar(1)">
          <option [ngValue]="null">Activos e inactivos</option>
          <option [ngValue]="true">Solo activos</option>
          <option [ngValue]="false">Solo inactivos</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Alta</th><th></th></tr></thead>
          <tbody>
            @for (u of datos()?.items ?? []; track u.id) {
              <tr [class.inactive]="!u.activo">
                <td><div class="cell-main"><span class="thumb av">{{ u.nombre.charAt(0) }}</span><span><strong>{{ u.nombre }} @if (u.id === yo()) { <span class="me">(vos)</span> }</strong><small>{{ u.email }}</small></span></div></td>
                <td><span class="badge no-dot" [class.badge-info]="u.rol === 'SuperAdmin'">{{ u.rol }}</span></td>
                <td><app-activo-badge [activo]="u.activo" /></td>
                <td class="muted">{{ u.fechaCreacion | date: 'dd/MM/yyyy' }}</td>
                <td class="actions">
                  <button type="button" class="icon-btn" (click)="abrir(u)" [attr.aria-label]="'Editar ' + u.nombre" title="Editar"><lucide-icon [img]="i.Pencil" [size]="18" /></button>
                  @if (u.id !== yo()) {
                    <button type="button" class="icon-btn" (click)="toggle(u)" [attr.aria-label]="(u.activo ? 'Dar de baja a ' : 'Reactivar a ') + u.nombre" [title]="u.activo ? 'Dar de baja' : 'Reactivar'"><lucide-icon [img]="i.Power" [size]="18" /></button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted">{{ cargando() ? 'Cargando…' : 'No hay usuarios con estos filtros.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (datos(); as d) {
        <div class="panel-foot"><app-pagination [page]="d.page" [pageSize]="d.pageSize" [total]="d.total" (cambiar)="cargar($event)" /></div>
      }
    </section>

    @if (editando(); as e) {
      <div class="modal-backdrop" @modal (click)="editando.set(null)"></div>
      <form class="modal" @modal role="dialog" aria-modal="true" aria-labelledby="u-title" [formGroup]="form" (ngSubmit)="guardar()" (keydown.escape)="editando.set(null)">
        <h2 id="u-title">{{ e.id ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
        <div class="field">
          <label for="u-nombre">Nombre</label>
          <input id="u-nombre" class="input" formControlName="nombre" />
          @if (err()['nombre']) { <span class="error">{{ err()['nombre'] }}</span> }
        </div>
        <div class="field">
          <label for="u-email">Email</label>
          <input id="u-email" class="input" type="email" formControlName="email" autocomplete="off" />
          @if (err()['email']) { <span class="error">{{ err()['email'] }}</span> }
        </div>
        @if (!e.id) {
          <div class="field">
            <label for="u-pass">Contraseña inicial</label>
            <input id="u-pass" class="input" type="password" formControlName="password" autocomplete="new-password" />
            <span class="hint">Mínimo 8 caracteres. Después la puede cambiar desde “Mi cuenta”.</span>
            @if (err()['password']) { <span class="error">{{ err()['password'] }}</span> }
          </div>
        }
        <div class="field">
          <label for="u-rol">Rol</label>
          <select id="u-rol" class="select" formControlName="rol">
            <option value="Admin">Admin (dueño)</option>
            <option value="SuperAdmin">SuperAdmin (desarrollo)</option>
          </select>
          @if (e.id) { <span class="hint">Cambiar el rol cierra las sesiones abiertas de ese usuario.</span> }
          @if (err()['rol']) { <span class="error">{{ err()['rol'] }}</span> }
        </div>
        @if (err()['_']) { <div class="alert alert-danger"><lucide-icon [img]="i.AlertCircle" [size]="18" /><p>{{ err()['_'] }}</p></div> }
        <div class="modal-actions">
          <button type="button" class="btn" (click)="editando.set(null)">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">@if (guardando()) { <span class="spinner"></span> } Guardar</button>
        </div>
      </form>
    }
  `,
  styles: `
    .av { border-radius: 50% !important; background: var(--berry-100) !important; color: var(--berry-600) !important; font-weight: 700; }
    .me { color: var(--text-muted); font-weight: 600; font-size: .85rem; }
    .inactive td:not(.actions) { opacity: .6; }
    .alert { margin-bottom: 12px; }
  `,
})
export class UsuariosComponent {
  private api = inject(PanelApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(FormBuilder);
  readonly i = I;

  readonly datos = signal<Paginado<Usuario> | null>(null);
  readonly cargando = signal(true);
  readonly rol = signal<Rol | null>(null);
  readonly activo = signal<boolean | null>(null);
  readonly editando = signal<{ id: number | null } | null>(null);
  readonly guardando = signal(false);
  readonly err = signal<Record<string, string>>({});
  readonly yo = () => this.auth.usuario()?.id;

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    rol: ['Admin' as Rol],
  });

  constructor() {
    this.cargar(1);
  }

  cargar(page: number): void {
    this.cargando.set(true);
    this.api.usuarios({ page, pageSize: 20, rol: this.rol(), activo: this.activo(), orderBy: 'nombre', orderDir: 'asc' }).subscribe({
      next: r => { this.datos.set(r); this.cargando.set(false); },
      error: e => { this.cargando.set(false); this.toast.error(mensajeError(e)); },
    });
  }

  abrir(u?: Usuario): void {
    this.err.set({});
    this.form.reset({ nombre: u?.nombre ?? '', email: u?.email ?? '', password: '', rol: u?.rol ?? 'Admin' });
    this.editando.set({ id: u?.id ?? null });
  }

  guardar(): void {
    const id = this.editando()!.id;
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.err.set({});
    const req = id
      ? this.api.editarUsuario(id, { nombre: v.nombre.trim(), email: v.email.trim(), rol: v.rol })
      : this.api.crearUsuario({ nombre: v.nombre.trim(), email: v.email.trim(), password: v.password, rol: v.rol });
    req.subscribe({
      next: () => {
        this.guardando.set(false);
        this.editando.set(null);
        this.toast.exito(id ? 'Usuario actualizado.' : 'Usuario creado.');
        this.cargar(this.datos()?.page ?? 1);
      },
      error: e => {
        this.guardando.set(false);
        const campos = erroresPorCampo(e);
        this.err.set(Object.keys(campos).length ? campos : { _: mensajeError(e) });
      },
    });
  }

  async toggle(u: Usuario): Promise<void> {
    if (u.activo && !(await this.confirm.preguntar({ titulo: `¿Dar de baja a ${u.nombre}?`, mensaje: 'No va a poder entrar al panel y se cierran sus sesiones abiertas.', confirmar: 'Dar de baja', peligro: true }))) return;
    this.api.activoUsuario(u.id, !u.activo).subscribe({
      next: r => {
        this.datos.update(d => d && { ...d, items: d.items.map(x => (x.id === r.id ? r : x)) });
        this.toast.exito(r.activo ? `${r.nombre} reactivado.` : `${r.nombre} dado de baja.`);
      },
      error: e => this.toast.error(mensajeError(e)),
    });
  }
}
