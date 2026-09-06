import path from "node:path";

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
  turbopack: {
    // In git worktrees (.codex/worktrees/*), allow Turbopack to resolve outside the worktree to root node_modules
    ...(import.meta.dirname.includes("worktrees")
      ? { root: path.resolve(import.meta.dirname, "../../..") }
      : {}),
  },
};

export default nextConfig;
