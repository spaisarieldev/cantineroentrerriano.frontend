// Producción: el front y la API se sirven bajo el mismo dominio (rewrites de Vercel a Render), así la cookie
// del refresh token (SameSite=Strict, Path=/api/v1/auth) viaja sin problemas.
export const environment = {
  production: true,
  apiUrl: '/api/v1',
  // Base para las rutas relativas de las fotos (/uploads/...). Vacío = mismo origen.
  archivosUrl: '',
  // Public Key de Mercado Pago (es pública; el Access Token vive solo en el backend).
  mercadoPagoPublicKey: 'APP_USR-5e1e38a8-fa3e-4953-8070-a5aea76adc4f',
};
