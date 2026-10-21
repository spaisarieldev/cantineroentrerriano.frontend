import { Pipe, PipeTransform } from '@angular/core';

const conDecimales = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sinDecimales = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** $ 12.500 (o $ 12.500,50 si tiene centavos). */
@Pipe({ name: 'ars' })
export class ArsPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || isNaN(valor)) return '—';
    return (Number.isInteger(valor) ? sinDecimales : conDecimales).format(valor);
  }
}
