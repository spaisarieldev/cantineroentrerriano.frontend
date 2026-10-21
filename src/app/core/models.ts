// Contratos de la API (espejo de los DTOs del backend, camelCase por System.Text.Json).

export type EstadoPedido = 'Pendiente' | 'Pagado' | 'Cancelado' | 'Reembolsado';
export type EstadoEnvio = 'Despachado' | 'NoDespachado';
export type Rol = 'Admin' | 'SuperAdmin';

export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ParametrosListado {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  buscar?: string | null;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  pedidoId?: number;
  tokenPago?: string;
}

/* ---------- Catálogo ---------- */
export interface ProductoFoto {
  id: number;
  ruta: string;
  orden: number;
  principal: boolean;
}

export interface ProductoPublico {
  id: number;
  nombre: string;
  descripcion: string | null;
  precioUnitario: number;
  unidadesPorPack: number;
  precioPack: number;
  stock: number;
  packsDisponibles: number;
  marcaId: number;
  marcaNombre: string;
  varianteId: number | null;
  varianteNombre: string | null;
  fotos: ProductoFoto[];
}

export interface Producto extends ProductoPublico {
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface Opcion {
  id: number;
  nombre: string;
}

export interface ProductoFiltro extends ParametrosListado {
  marcaId?: number | null;
  varianteId?: number | null;
  activo?: boolean | null;
}

export interface GuardarProducto {
  nombre: string;
  descripcion: string | null;
  precioUnitario: number | null;
  unidadesPorPack: number | null;
  marcaId: number | null;
  varianteId: number | null;
  stockInicial?: number | null;
}

/* ---------- Checkout ---------- */
export interface DatosCliente {
  nombre: string;
  telefono: string;
  direccion: string;
}

export interface DatosPago {
  token: string;
  metodoPagoId: string;
  tipoMetodoPago: string;
  cuotas: number;
  email: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
}

export interface CrearPedido {
  cliente: DatosCliente;
  items: { productoId: number; cantidadPacks: number }[];
  pago: DatosPago;
}

export interface ResultadoPago {
  mpOrderId: string;
  estado: string;
  statusDetail: string | null;
  detalleTransaccion: string | null;
}

export interface ItemPedidoCreado {
  productoId: number;
  nombre: string;
  cantidadPacks: number;
  unidadesPorPack: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PedidoCreado {
  pedidoId: number;
  estado: EstadoPedido;
  total: number;
  fechaExpiracionReserva: string | null;
  tokenPago: string;
  items: ItemPedidoCreado[];
  pago: ResultadoPago;
}

export interface ReintentoPago {
  pedidoId: number;
  estado: EstadoPedido;
  total: number;
  fechaExpiracionReserva: string | null;
  pago: ResultadoPago;
}

/* ---------- Auth ---------- */
export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface Sesion {
  accessToken: string;
  expiracion: string;
  usuario: UsuarioSesion;
}

/* ---------- Panel ---------- */
export interface Catalogo {
  id: number;
  nombre: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface MotivoStock extends Catalogo {
  esSistema: boolean;
  requierePedidoId: boolean;
}

export interface MovimientoStockHistorial {
  id: number;
  fecha: string;
  cantidad: number;
  motivoId: number;
  motivoNombre: string;
  motivoEsSistema: boolean;
  usuarioId: number | null;
  usuarioNombre: string | null;
  pedidoId: number | null;
}

export interface MovimientoStockCreado {
  id: number;
  productoId: number;
  cantidad: number;
  motivoId: number;
  motivoNombre: string;
  fecha: string;
  usuarioId: number | null;
  stockResultante: number;
}

export interface PedidoResumen {
  id: number;
  fecha: string;
  estado: EstadoPedido;
  estadoEnvio: EstadoEnvio;
  total: number;
  clienteId: number;
  clienteNombre: string;
  clienteDni: string;
  requiereRevision: boolean;
}

export interface Pago {
  id: number;
  mpOrderId: string | null;
  mpPaymentId: string | null;
  estado: string;
  mpStatusDetail: string | null;
  monto: number;
  fecha: string;
}

export interface PedidoDetalle {
  id: number;
  fecha: string;
  estado: EstadoPedido;
  estadoEnvio: EstadoEnvio;
  total: number;
  fechaExpiracionReserva: string | null;
  reservaActiva: boolean;
  requiereRevision: boolean;
  cliente: { id: number; dni: string; nombre: string };
  contacto: { telefono: string; direccion: string; email: string; fechaDesde: string };
  items: {
    id: number;
    productoId: number;
    productoNombre: string;
    cantidad: number;
    packs: number;
    unidadesPorPack: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  pagos: Pago[];
}

export interface PedidoFiltro extends ParametrosListado {
  estado?: EstadoPedido | null;
  estadoEnvio?: EstadoEnvio | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  requiereRevision?: boolean | null;
}

export interface Cliente {
  id: number;
  dni: string;
  nombre: string;
  fechaCreacion: string;
}

export interface ClienteDetalle extends Cliente {
  historico: { id: number; telefono: string; direccion: string; email: string; fechaDesde: string }[];
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}
