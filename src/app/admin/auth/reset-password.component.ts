import { Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { erroresPorCampo, mensajeError } from '../../core/http.utils';
import { AuthShellComponent } from './auth-shell.component';
import { I } from '../../shared/icons';

export function coinciden(group: AbstractControl): ValidationErrors | null {
  const a = group.get('password')?.value;
  const b = group.get('confirmar')?.value;
  return a && b && a !== b ? { noCoinciden: true } : null;
}

/** Link del mail: /reset-password?token=... */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthShellComponent],
  template: `
    <app-auth-shell titulo="Nueva contraseña" subtitulo="Elegí una contraseña segura para tu cuenta del panel.">
      @if (!token()) {
        <div class="alert alert-warning"><lucide-icon [img]="i.AlertTriangle" [size]="20" /><p><strong>Link inválido</strong>Pedí un link nuevo desde “¿Olvidaste tu contraseña?”.</p></div>
        <a routerLink="/admin/recuperar" class="btn btn-primary btn-block">Pedir otro link</a>
      } @else if (listo()) {
        <div class="alert alert-success" role="status"><lucide-icon [img]="i.CheckCircle2" [size]="20" /><p><strong>¡Listo!</strong>{{ listo() }}</p></div>
        <a routerLink="/admin/login" class="btn btn-primary btn-block">Ingresar</a>
      } @else {
        @if (error()) { <div class="alert alert-danger" role="alert"><lucide-icon [img]="i.AlertCircle" [size]="20" /><p>{{ error() }}</p></div> }
        <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
          <div class="field">
            <label for="password">Contraseña nueva</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password" aria-describedby="pw-hint" />
            <span class="hint" id="pw-hint">Mínimo 8 caracteres.</span>
            @if (campos()['password']) { <span class="error">{{ campos()['password'] }}</span> }
            @else if (form.controls.password.invalid && form.controls.password.touched) { <span class="error">Usá al menos 8 caracteres.</span> }
          </div>
          <div class="field">
            <label for="confirmar">Repetí la contraseña</label>
            <input id="confirmar" class="input" type="password" formControlName="confirmar" autocomplete="new-password" />
            @if (form.hasError('noCoinciden') && form.controls.confirmar.touched) { <span class="error">Las contraseñas no coinciden.</span> }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="cargando()">
            @if (cargando()) { <span class="spinner"></span> Guardando… } @else { Guardar contraseña }
          </button>
        </form>
      }
    </app-auth-shell>
  `,
  styles: `.alert { margin-bottom: 20px; }`,
})
export class ResetPasswordComponent {
  readonly token = input<string>();
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  readonly i = I;
  readonly cargando = signal(false);
  readonly listo = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly campos = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group(
    { password: ['', [Validators.required, Validators.minLength(8)]], confirmar: ['', Validators.required] },
    { validators: coinciden },
  );

  enviar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.cargando.set(true);
    this.error.set(null);
    this.campos.set({});
    this.auth.resetPassword(this.token()!, this.form.getRawValue().password).subscribe({
      next: r => { this.cargando.set(false); this.listo.set(r.mensaje); },
      error: e => {
        this.cargando.set(false);
        this.campos.set(erroresPorCampo(e));
        this.error.set(mensajeError(e));
      },
    });
  }
}
