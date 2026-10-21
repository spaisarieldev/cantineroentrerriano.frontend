import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { PanelApiService } from '../../core/panel-api.service';
import { AuthService } from '../../core/auth.service';
import { erroresPorCampo, mensajeError } from '../../core/http.utils';
import { ToastService } from '../../core/toast.service';
import { coinciden } from '../auth/reset-password.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-mi-cuenta',
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="page-head"><div><h1>Mi cuenta</h1><p>Tus datos de acceso al panel.</p></div></div>
    <div class="grid-2">
      <form class="panel" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div class="panel-head"><h2>Cambiar contraseña</h2></div>
        <div class="panel-body">
          <div class="field">
            <label for="actual">Contraseña actual</label>
            <input id="actual" class="input" type="password" formControlName="passwordActual" autocomplete="current-password" />
            @if (err()['passwordActual']) { <span class="error">{{ err()['passwordActual'] }}</span> }
          </div>
          <div class="field">
            <label for="nueva">Contraseña nueva</label>
            <input id="nueva" class="input" type="password" formControlName="password" autocomplete="new-password" />
            <span class="hint">Mínimo 8 caracteres.</span>
            @if (err()['passwordNueva']) { <span class="error">{{ err()['passwordNueva'] }}</span> }
          </div>
          <div class="field">
            <label for="conf">Repetí la contraseña nueva</label>
            <input id="conf" class="input" type="password" formControlName="confirmar" autocomplete="new-password" />
            @if (form.hasError('noCoinciden') && form.controls.confirmar.touched) { <span class="error">Las contraseñas no coinciden.</span> }
          </div>
          @if (err()['_']) { <div class="alert alert-danger"><lucide-icon [img]="i.AlertCircle" [size]="18" /><p>{{ err()['_'] }}</p></div> }
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">@if (guardando()) { <span class="spinner"></span> } Actualizar contraseña</button>
        </div>
      </form>

      <section class="panel">
        <div class="panel-head"><h2>Tu usuario</h2></div>
        <div class="panel-body">
          <dl class="kv">
            <dt>Nombre</dt><dd>{{ auth.usuario()?.nombre }}</dd>
            <dt>Email</dt><dd>{{ auth.usuario()?.email }}</dd>
            <dt>Rol</dt><dd>{{ auth.usuario()?.rol }}</dd>
          </dl>
        </div>
      </section>
    </div>
  `,
  styles: `.alert { margin-bottom: 16px; }`,
})
export class MiCuentaComponent {
  readonly auth = inject(AuthService);
  private api = inject(PanelApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  readonly i = I;
  readonly guardando = signal(false);
  readonly err = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group(
    { passwordActual: ['', Validators.required], password: ['', [Validators.required, Validators.minLength(8)]], confirmar: ['', Validators.required] },
    { validators: coinciden },
  );

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.password.hasError('minlength')) this.err.set({ passwordNueva: 'Usá al menos 8 caracteres.' });
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.err.set({});
    this.api.cambiarPassword(this.auth.usuario()!.id, v.passwordActual, v.password).subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.reset();
        this.toast.exito('Tu contraseña se actualizó.');
      },
      error: e => {
        this.guardando.set(false);
        const campos = erroresPorCampo(e);
        this.err.set(Object.keys(campos).length ? campos : { _: mensajeError(e) });
      },
    });
  }
}
