/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para el build de Docker: genera un servidor "standalone"
  // con solo lo necesario para correr en producción.
  output: "standalone",
  // El servidor de desarrollo bloquea por defecto los recursos de HMR pedidos
  // desde un origen distinto al que abrió el navegador; Playwright navega a
  // 127.0.0.1 aunque el server escucha en localhost, así que sin esto el bundle
  // del cliente no termina de hidratar durante las pruebas E2E (#88).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
