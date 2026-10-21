import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/http.utils';
import { AuthShellComponent } from './auth-shell.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthShellComponent],
  template: `
    <app-auth-shell titulo="Bienvenido de nuevo" subtitulo="Ingresá para gestionar productos, stock y pedidos.">
      @if (motivo() === 'expirada') {
        <div class="alert alert-info"><lucide-icon [img]="i.Clock" [size]="20" /><p>Tu sesión venció. Volvé a ingresar para continuar.</p></div>
      }
      @if (error()) {
        <div class="alert alert-danger" role="alert"><lucide-icon [img]="i.AlertCircle" [size]="20" /><p>{{ error() }}</p></div>
      }
      <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <div class="input-icon"><lucide-icon [img]="i.Mail" [size]="18" />
            <input id="email" class="input" type="email" formControlName="email" autocomplete="username" autofocus /></div>
          @if (form.controls.email.invalid && form.controls.email.touched) { <span class="error">Ingresá un email válido.</span> }
        </div>
        <div class="field">
          <div class="lbl-row">
            <label for="password">Contraseña</label>
            <a routerLink="/admin/recuperar" class="forgot">¿La olvidaste?</a>
          </div>
          <div class="input-icon pw"><lucide-icon [img]="i.KeyRound" [size]="18" />
            <input id="password" class="input" [type]="ver() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
            <button type="button" class="eye" (click)="ver.set(!ver())" [attr.aria-label]="ver() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <lucide-icon [img]="ver() ? i.EyeOff : i.Eye" [size]="18" />
            </button>
          </div>
          @if (form.controls.password.invalid && form.controls.password.touched) { <span class="error">Ingresá tu contraseña.</span> }
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="cargando()">
          @if (cargando()) { <span class="spinner"></span> Ingresando… } @else { Ingresar <lucide-icon [img]="i.ArrowRight" [size]="18" /> }
        </button>
      </form>
    </app-auth-shell>
  `,
  styles: `
    .alert { margin-bottom: 20px; }
    .lbl-row { display: flex; justify-content: space-between; align-items: baseline; }
    .forgot { font-size: .86rem; font-weight: 700; }
    .pw { .input { padding-right: 3rem; } }
    .eye { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--ink-600); border-radius: 8px;
      lucide-icon { position: static; transform: none; color: inherit; } &:hover { background: var(--surface-2); } }
    form { margin-top: 4px; }
  `,
})
export class LoginComponent {
  readonly volver = input<string>();
  readonly motivo = input<string>();
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  readonly i = I;

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly ver = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  enviar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.cargando.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        const destino = this.volver();
        this.router.navigateByUrl(destino && destino.startsWith('/admin') ? destino : '/admin');
      },
      error: e => {
        this.cargando.set(false);
        this.error.set(mensajeError(e, 'No pudimos iniciar sesión.'));
      },
    });
  }
}
