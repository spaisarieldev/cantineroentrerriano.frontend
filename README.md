# Cantineros Entrerrianos — Front (tienda + panel)

Angular 19 standalone (signals, control flow `@if/@for`, rutas lazy), SCSS sin framework de UI.
Animaciones: `@angular/animations` (entradas, drawer, toasts, listas) + GSAP/ScrollTrigger (presentación del hero y reveals con scroll). Íconos: `lucide-angular`.

## Correr en desarrollo

1. Levantar la API (`cantineroentrerriano.backend`) en `http://localhost:5246`.
2. `npm install` y `npm start` → http://localhost:4200

`proxy.conf.json` manda `/api` y `/uploads` a la API, así el front y la API quedan en el mismo origen y la cookie del refresh token (`SameSite=Strict`, `Path=/api/v1/auth`) funciona.

## Configuración

- `src/environments/environment.development.ts` → `mercadoPagoPublicKey`: **Public Key de prueba** de Mercado Pago (necesaria para el Card Payment Brick).
- `src/environments/environment.ts` → Public Key productiva.
- En el backend, `RESET_PASSWORD_URL` tiene que apuntar a `http://localhost:4200/reset-password`.

## Rutas

| Tienda | Panel (`/admin`, requiere login) |
|---|---|
| `/` home con hero animado | `/admin` resumen (KPIs, ventas 14 días, stock bajo) |
| `/tienda` catálogo con filtros | `/admin/pedidos` + detalle (despacho, cancelar, reembolsado) |
| `/producto/:id` | `/admin/productos` + alta/edición, fotos y stock |
| `/carrito` | `/admin/clientes` + historial de contacto |
| `/checkout` datos → pago (Brick) → resultado | `/admin/marcas`, `/admin/variantes`, `/admin/motivos-stock` |
| | `/admin/usuarios` (solo SuperAdmin), `/admin/mi-cuenta` |
| | `/admin/login`, `/admin/recuperar`, `/reset-password?token=` |

## Checkout

- Un pago **rechazado** no es error: se guarda `pedidoId` + `tokenPago` en `sessionStorage` y se reintenta con `POST /pedidos/{id}/pagos` hasta que vence la reserva.
- **502** (Mercado Pago no respondió): mismo mecanismo con los datos del ProblemDetails.
- `STOCK_INSUFICIENTE` / `PRODUCTO_INVALIDO`: se resincroniza el carrito con el catálogo.

## Diseño

Sistema de diseño en `src/styles.scss` (tokens en `:root`). Paleta tomada de la foto del Kumquat (arándano, kumquat, madera, vino). Tipografías Playfair Display + Nunito Sans.
La foto del hero se recortó para sacar los íconos de Instagram (`public/img/kumquat-hero.webp|jpg`).
