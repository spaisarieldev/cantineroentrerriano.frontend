import { Routes } from '@angular/router';
import { invitadoGuard, panelGuard, superAdminGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./store/layout/store-layout.component').then(m => m.StoreLayoutComponent),
    children: [
      { path: '', title: 'Cantineros Entrerrianos · Cócteles y bebidas para tu negocio', loadComponent: () => import('./store/home/home.component').then(m => m.HomeComponent) },
      { path: 'tienda', title: 'Tienda · Cantineros Entrerrianos', loadComponent: () => import('./store/catalog/catalog.component').then(m => m.CatalogComponent) },
      { path: 'producto/:id', title: 'Producto · Cantineros Entrerrianos', loadComponent: () => import('./store/product-detail/product-detail.component').then(m => m.ProductDetailComponent) },
      { path: 'carrito', title: 'Tu pedido · Cantineros Entrerrianos', loadComponent: () => import('./store/cart/cart-page.component').then(m => m.CartPageComponent) },
      { path: 'checkout', title: 'Finalizar compra · Cantineros Entrerrianos', loadComponent: () => import('./store/checkout/checkout.component').then(m => m.CheckoutComponent) },
    ],
  },
  { path: 'admin/login', title: 'Ingresar · Panel', canActivate: [invitadoGuard], loadComponent: () => import('./admin/auth/login.component').then(m => m.LoginComponent) },
  { path: 'admin/recuperar', title: 'Recuperar contraseña · Panel', loadComponent: () => import('./admin/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', title: 'Nueva contraseña · Panel', loadComponent: () => import('./admin/auth/reset-password.component').then(m => m.ResetPasswordComponent) },
  {
    path: 'admin',
    canActivate: [panelGuard],
    loadComponent: () => import('./admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', title: 'Resumen · Panel', loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'pedidos', title: 'Pedidos · Panel', loadComponent: () => import('./admin/pedidos/pedidos-list.component').then(m => m.PedidosListComponent) },
      { path: 'pedidos/:id', title: 'Pedido · Panel', loadComponent: () => import('./admin/pedidos/pedido-detail.component').then(m => m.PedidoDetailComponent) },
      { path: 'productos', title: 'Productos · Panel', loadComponent: () => import('./admin/productos/productos-list.component').then(m => m.ProductosListComponent) },
      { path: 'productos/nuevo', title: 'Nuevo producto · Panel', loadComponent: () => import('./admin/productos/producto-form.component').then(m => m.ProductoFormComponent) },
      { path: 'productos/:id', title: 'Producto · Panel', loadComponent: () => import('./admin/productos/producto-form.component').then(m => m.ProductoFormComponent) },
      { path: 'clientes', title: 'Clientes · Panel', loadComponent: () => import('./admin/clientes/clientes-list.component').then(m => m.ClientesListComponent) },
      { path: 'clientes/:id', title: 'Cliente · Panel', loadComponent: () => import('./admin/clientes/cliente-detail.component').then(m => m.ClienteDetailComponent) },
      { path: 'marcas', title: 'Marcas · Panel', data: { recurso: 'marcas' }, loadComponent: () => import('./admin/catalogos/catalogo-list.component').then(m => m.CatalogoListComponent) },
      { path: 'variantes', title: 'Variantes · Panel', data: { recurso: 'variantes' }, loadComponent: () => import('./admin/catalogos/catalogo-list.component').then(m => m.CatalogoListComponent) },
      { path: 'motivos-stock', title: 'Motivos de stock · Panel', data: { recurso: 'motivos-stock' }, loadComponent: () => import('./admin/catalogos/catalogo-list.component').then(m => m.CatalogoListComponent) },
      { path: 'usuarios', title: 'Usuarios · Panel', canActivate: [superAdminGuard], loadComponent: () => import('./admin/usuarios/usuarios.component').then(m => m.UsuariosComponent) },
      { path: 'mi-cuenta', title: 'Mi cuenta · Panel', loadComponent: () => import('./admin/cuenta/mi-cuenta.component').then(m => m.MiCuentaComponent) },
    ],
  },
  { path: '**', title: 'Página no encontrada', loadComponent: () => import('./shared/not-found.component').then(m => m.NotFoundComponent) },
];
