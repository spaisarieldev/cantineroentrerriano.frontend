// Desarrollo: `ng serve` usa proxy.conf.json para mandar /api y /uploads a la API (http://localhost:5246).
export const environment = {
  production: false,
  apiUrl: '/api/v1',
  archivosUrl: '',
  // Public Key de PRUEBA de Mercado Pago (Tus integraciones → Credenciales de prueba).
  mercadoPagoPublicKey: 'APP_USR-5e1e38a8-fa3e-4953-8070-a5aea76adc4f',
};
