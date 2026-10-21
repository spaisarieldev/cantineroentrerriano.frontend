import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { CrearPedido, Opcion, Paginado, PedidoCreado, ProductoFiltro, ProductoPublico, ReintentoPago, DatosPago } from './models';
import { toParams } from './http.utils';

/** Endpoints públicos de la tienda. */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  private marcas$?: Observable<Opcion[]>;
  private variantes$?: Observable<Opcion[]>;

  productos(filtro: ProductoFiltro = {}): Observable<Paginado<ProductoPublico>> {
    return this.http.get<Paginado<ProductoPublico>>(`${this.api}/productos`, { params: toParams(filtro) });
  }

  producto(id: number): Observable<ProductoPublico> {
    return this.http.get<ProductoPublico>(`${this.api}/productos/${id}`);
  }

  marcas(): Observable<Opcion[]> {
    return (this.marcas$ ??= this.http.get<Opcion[]>(`${this.api}/marcas`).pipe(shareReplay(1)));
  }

  variantes(): Observable<Opcion[]> {
    return (this.variantes$ ??= this.http.get<Opcion[]>(`${this.api}/variantes`).pipe(shareReplay(1)));
  }

  crearPedido(body: CrearPedido): Observable<PedidoCreado> {
    return this.http.post<PedidoCreado>(`${this.api}/pedidos`, body);
  }

  reintentarPago(pedidoId: number, tokenPago: string, pago: DatosPago): Observable<ReintentoPago> {
    return this.http.post<ReintentoPago>(`${this.api}/pedidos/${pedidoId}/pagos`, { tokenPago, pago });
  }
}
