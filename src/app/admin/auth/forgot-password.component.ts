import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/http.utils';
import { AuthShellComponent } from './auth-shell.component';
import { I } from '../../shared/icons';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthShellComponent],
  template: `
    <app-auth-shell titulo="Recuperar contraseña" subtitulo="Te mandamos un link para crear una contraseña nueva. Vence en 30 minutos.">
      @if (enviado()) {
        <div class="alert alert-success" role="status">
          <lucide-icon [img]="i.Mail" [size]="20" />
          <p><strong>Revisá tu correo</strong>{{ enviado() }}</p>
        </div>
        <a routerLink="/admin/login" class="btn btn-block">Volver a ingresar</a>
      } @else {
        @if (error()) { <div class="alert alert-danger" role="alert"><lucide-icon [img]="i.AlertCircle" [size]="20" /><p>{{ error() }}</p></div> }
        <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
          <div class="field">
            <label for="email">Email de tu cuenta</label>
            <div class="input-icon"><lucide-icon [img]="i.Mail" [size]="18" />
              <input id="email" class="input" type="email" formControlName="email" autocomplete="email" autofocus /></div>
            @if (form.controls.email.invalid && form.controls.email.touched) { <span class="error">Ingresá un email válido.</span> }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="cargando()">
            @if (cargando()) { <span class="spinner"></span> Enviando… } @else { Enviar link }
          </button>
          <a routerLink="/admin/login" class="btn btn-ghost btn-block back">Volver a ingresar</a>
        </form>
      }
    </app-auth-shell>
  `,
  styles: `.alert { margin-bottom: 20px; } .back { margin-top: 8px; }`,
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  readonly i = I;
  readonly cargando = signal(false);
  readonly enviado = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  enviar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.cargando.set(true);
    this.error.set(null);
    this.auth.forgotPassword(this.form.getRawValue().email.trim()).subscribe({
      next: r => { this.cargando.set(false); this.enviado.set(r.mensaje); },
      error: e => { this.cargando.set(false); this.error.set(mensajeError(e)); },
    });
  }
}
