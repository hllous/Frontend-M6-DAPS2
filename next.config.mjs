/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para el build de Docker: genera un servidor "standalone"
  // con solo lo necesario para correr en producción.
  output: "standalone",
};

export default nextConfig;
