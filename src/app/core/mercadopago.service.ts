import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { DatosPago } from './models';

/* Tipos mínimos del SDK v2 de Mercado Pago (https://sdk.mercadopago.com/js/v2). */
interface BrickController { unmount(): void; }
interface MercadoPagoInstance {
  bricks(): { create(tipo: 'cardPayment', contenedor: string, config: unknown): Promise<BrickController> };
}
declare global {
  interface Window { MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => MercadoPagoInstance; }
}

interface CardFormData {
  token: string;
  payment_method_id: string;
  installments: number;
  payer: { email: string; identification: { type: string; number: string } };
}

const SDK = 'https://sdk.mercadopago.com/js/v2';

/** Mensajes para el cliente según status_detail de la transacción rechazada. */
const RECHAZOS: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Revisá el número de la tarjeta.',
  cc_rejected_bad_filled_date: 'Revisá la fecha de vencimiento.',
  cc_rejected_bad_filled_security_code: 'Revisá el código de seguridad.',
  cc_rejected_bad_filled_other: 'Revisá los datos de la tarjeta.',
  cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_call_for_authorize: 'Tenés que autorizar el pago con tu banco antes de reintentar.',
  cc_rejected_card_disabled: 'La tarjeta no está activa. Llamá a tu banco para activarla.',
  cc_rejected_duplicated_payment: 'Ya hiciste un pago por ese valor. Si necesitás pagar de nuevo, usá otra tarjeta.',
  cc_rejected_high_risk: 'El pago fue rechazado. Probá con otra tarjeta.',
  cc_rejected_max_attempts: 'Llegaste al límite de intentos con esa tarjeta. Probá con otra.',
  cc_rejected_blacklist: 'No pudimos procesar el pago. Probá con otra tarjeta.',
  cc_rejected_invalid_installments: 'La tarjeta no acepta esa cantidad de cuotas.',
  cc_rejected_other_reason: 'El banco rechazó el pago. Probá con otra tarjeta.',
  cc_rejected_card_error: 'No pudimos procesar la tarjeta. Probá con otra.',
  rejected_by_issuer: 'El banco emisor rechazó el pago. Probá con otra tarjeta.',
  rejected_by_bank: 'El banco rechazó el pago. Probá con otra tarjeta.',
  insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  rejected_high_risk: 'El pago fue rechazado por seguridad. Probá con otra tarjeta.',
  rejected_other_reason: 'El pago fue rechazado. Probá con otra tarjeta.',
  bad_filled_card_data: 'Revisá los datos de la tarjeta.',
  bad_filled_security_code: 'Revisá el código de seguridad.',
  bad_filled_date: 'Revisá la fecha de vencimiento.',
  card_disabled: 'La tarjeta no está activa. Llamá a tu banco para activarla.',
  call_for_authorize: 'Tenés que autorizar el pago con tu banco antes de reintentar.',
  max_attempts_exceeded: 'Llegaste al límite de intentos con esa tarjeta. Probá con otra.',
};

export function mensajeRechazo(detalle: string | null | undefined): string {
  if (detalle && RECHAZOS[detalle]) return RECHAZOS[detalle];
  return 'El pago fue rechazado. Revisá los datos o probá con otra tarjeta.';
}

export type EstadoResultado = 'aprobado' | 'revision' | 'rechazado';

export function clasificarPago(estado: string, statusDetail: string | null): EstadoResultado {
  if (estado === 'processed' || statusDetail === 'accredited') return 'aprobado';
  if (estado === 'processing' || estado === 'action_required' || estado === 'in_process') return 'revision';
  return 'rechazado';
}

@Injectable({ providedIn: 'root' })
export class MercadoPagoService {
  private sdk?: Promise<void>;
  private mp?: MercadoPagoInstance;
  private brick?: BrickController;

  get configurado(): boolean {
    return !environment.mercadoPagoPublicKey.includes('REEMPLAZAR');
  }

  private cargarSdk(): Promise<void> {
    if (window.MercadoPago) return Promise.resolve();
    return (this.sdk ??= new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { this.sdk = undefined; reject(new Error('No se pudo cargar Mercado Pago')); };
      document.head.appendChild(s);
    }));
  }

  /**
   * Monta el Card Payment Brick. Los datos de la tarjeta nunca pasan por nuestro código:
   * el Brick los manda a MP y nos devuelve un token de un solo uso.
   */
  async montar(contenedorId: string, monto: number, opciones: {
    onListo: () => void;
    onSubmit: (pago: DatosPago) => Promise<void>;
    onError: (mensaje: string) => void;
  }): Promise<void> {
    await this.cargarSdk();
    this.desmontar();
    this.mp ??= new window.MercadoPago!(environment.mercadoPagoPublicKey, { locale: 'es-AR' });

    this.brick = await this.mp.bricks().create('cardPayment', contenedorId, {
      initialization: { amount: Number(monto.toFixed(2)) },
      customization: {
        paymentMethods: { maxInstallments: 12, types: { excluded: ['prepaid_card'] } },
        visual: {
          hideFormTitle: true,
          style: {
            theme: 'default',
            customVariables: {
              baseColor: '#b3202b',
              borderRadiusMedium: '10px',
              borderRadiusLarge: '14px',
              fontSizeMedium: '16px',
            },
          },
        },
      },
      callbacks: {
        onReady: () => opciones.onListo(),
        onSubmit: (form: CardFormData, additional?: { paymentTypeId?: string }) =>
          opciones.onSubmit({
            token: form.token,
            metodoPagoId: form.payment_method_id,
            tipoMetodoPago: additional?.paymentTypeId ?? 'credit_card',
            cuotas: form.installments,
            email: form.payer.email,
            tipoIdentificacion: form.payer.identification.type,
            numeroIdentificacion: form.payer.identification.number,
          }),
        onError: (e: { message?: string; type?: string }) => {
          if (e?.type === 'non_critical') return;
          opciones.onError(e?.message ?? 'Hubo un problema con el formulario de pago.');
        },
      },
    });
  }

  desmontar(): void {
    try { this.brick?.unmount(); } catch { /* ya desmontado */ }
    this.brick = undefined;
  }
}
