import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Catalogo, Cliente, ClienteDetalle, EstadoEnvio, EstadoPedido, GuardarProducto, MotivoStock,
  MovimientoStockCreado, MovimientoStockHistorial, Paginado, ParametrosListado, Pago, PedidoDetalle,
  PedidoFiltro, PedidoResumen, Producto, ProductoFiltro, ProductoFoto, Rol, Usuario,
} from './models';
import { toParams } from './http.utils';

export type RecursoCatalogo = 'marcas' | 'variantes' | 'motivos-stock';

/** Endpoints del panel (/api/v1/panel/...). El interceptor agrega el Bearer. */
@Injectable({ providedIn: 'root' })
export class PanelApiService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/panel`;

  /* ---------- Productos ---------- */
  productos(f: ProductoFiltro = {}): Observable<Paginado<Producto>> {
    return this.http.get<Paginado<Producto>>(`${this.api}/productos`, { params: toParams(f) });
  }
  producto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.api}/productos/${id}`);
  }
  crearProducto(body: GuardarProducto): Observable<Producto> {
    return this.http.post<Producto>(`${this.api}/productos`, body);
  }
  editarProducto(id: number, body: GuardarProducto): Observable<Producto> {
    return this.http.put<Producto>(`${this.api}/productos/${id}`, body);
  }
  activoProducto(id: number, activo: boolean): Observable<Producto> {
    return this.http.put<Producto>(`${this.api}/productos/${id}/activo`, { activo });
  }

  /* ---------- Fotos ---------- */
  subirFoto(productoId: number, archivo: File): Observable<ProductoFoto> {
    const data = new FormData();
    data.append('archivo', archivo, archivo.name);
    return this.http.post<ProductoFoto>(`${this.api}/productos/${productoId}/fotos`, data);
  }
  eliminarFoto(productoId: number, fotoId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/productos/${productoId}/fotos/${fotoId}`);
  }
  fotoPrincipal(productoId: number, fotoId: number): Observable<ProductoFoto[]> {
    return this.http.put<ProductoFoto[]>(`${this.api}/productos/${productoId}/fotos/${fotoId}/principal`, null);
  }
  ordenarFotos(productoId: number, fotoIds: number[]): Observable<ProductoFoto[]> {
    return this.http.put<ProductoFoto[]>(`${this.api}/productos/${productoId}/fotos/orden`, { fotoIds });
  }

  /* ---------- Stock ---------- */
  movimientos(productoId: number, f: ParametrosListado & { motivoId?: number | null; fechaDesde?: string | null; fechaHasta?: string | null } = {}): Observable<Paginado<MovimientoStockHistorial>> {
    return this.http.get<Paginado<MovimientoStockHistorial>>(`${this.api}/productos/${productoId}/movimientos-stock`, { params: toParams(f) });
  }
  crearMovimiento(productoId: number, motivoId: number, cantidad: number): Observable<MovimientoStockCreado> {
    return this.http.post<MovimientoStockCreado>(`${this.api}/productos/${productoId}/movimientos-stock`, { motivoId, cantidad });
  }

  /* ---------- Marcas / Variantes / Motivos ---------- */
  catalogo<T extends Catalogo = Catalogo>(recurso: RecursoCatalogo, f: ParametrosListado & { activo?: boolean | null } = {}): Observable<Paginado<T>> {
    return this.http.get<Paginado<T>>(`${this.api}/${recurso}`, { params: toParams(f) });
  }
  crearCatalogo<T extends Catalogo = Catalogo>(recurso: RecursoCatalogo, nombre: string): Observable<T> {
    return this.http.post<T>(`${this.api}/${recurso}`, { nombre });
  }
  editarCatalogo<T extends Catalogo = Catalogo>(recurso: RecursoCatalogo, id: number, nombre: string): Observable<T> {
    return this.http.put<T>(`${this.api}/${recurso}/${id}`, { nombre });
  }
  activoCatalogo<T extends Catalogo = Catalogo>(recurso: RecursoCatalogo, id: number, activo: boolean): Observable<T> {
    return this.http.put<T>(`${this.api}/${recurso}/${id}/activo`, { activo });
  }
  motivos(f: ParametrosListado & { activo?: boolean | null } = {}): Observable<Paginado<MotivoStock>> {
    return this.catalogo<MotivoStock>('motivos-stock', f);
  }

  /* ---------- Pedidos ---------- */
  pedidos(f: PedidoFiltro = {}): Observable<Paginado<PedidoResumen>> {
    return this.http.get<Paginado<PedidoResumen>>(`${this.api}/pedidos`, { params: toParams(f) });
  }
  pedido(id: number): Observable<PedidoDetalle> {
    return this.http.get<PedidoDetalle>(`${this.api}/pedidos/${id}`);
  }
  pagosPedido(id: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.api}/pedidos/${id}/pagos`);
  }
  estadoEnvio(id: number, estadoEnvio: EstadoEnvio): Observable<PedidoDetalle> {
    return this.http.put<PedidoDetalle>(`${this.api}/pedidos/${id}/estado-envio`, { estadoEnvio });
  }
  estadoPedido(id: number, estado: EstadoPedido): Observable<PedidoDetalle> {
    return this.http.put<PedidoDetalle>(`${this.api}/pedidos/${id}/estado`, { estado });
  }

  /* ---------- Clientes ---------- */
  clientes(f: ParametrosListado = {}): Observable<Paginado<Cliente>> {
    return this.http.get<Paginado<Cliente>>(`${this.api}/clientes`, { params: toParams(f) });
  }
  cliente(id: number): Observable<ClienteDetalle> {
    return this.http.get<ClienteDetalle>(`${this.api}/clientes/${id}`);
  }

  /* ---------- Usuarios ---------- */
  usuarios(f: ParametrosListado & { rol?: Rol | null; activo?: boolean | null } = {}): Observable<Paginado<Usuario>> {
    return this.http.get<Paginado<Usuario>>(`${this.api}/usuarios`, { params: toParams(f) });
  }
  crearUsuario(body: { nombre: string; email: string; password: string; rol: Rol }): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.api}/usuarios`, body);
  }
  editarUsuario(id: number, body: { nombre: string; email: string; rol: Rol }): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.api}/usuarios/${id}`, body);
  }
  activoUsuario(id: number, activo: boolean): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.api}/usuarios/${id}/activo`, { activo });
  }
  cambiarPassword(id: number, passwordActual: string, passwordNueva: string): Observable<void> {
    return this.http.put<void>(`${this.api}/usuarios/${id}/password`, { passwordActual, passwordNueva });
  }
}
