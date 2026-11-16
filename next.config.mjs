import path from "node:path";

/** Cabeceras de seguridad que no dependen del pedido (#956). La CSP de las páginas la agrega src/proxy.ts, con nonce. */
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app solo usa geolocalización (selector de ubicación); el resto de las funciones quedan apagadas.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
];

/** Las respuestas del BFF son JSON: no cargan nada, igual que el Backend. */
export const API_CSP = "default-src 'none'; frame-ancestors 'none'";

export function resolveNextDistDir(value) {
  return typeof value === "string" && /^\.next(?:[-._][A-Za-z0-9][A-Za-z0-9_-]*)?$/.test(value)
    ? value
    : ".next";
}

export function typescriptConfigPathForDistDir(distDir) {
  return distDir === ".next" ? "tsconfig.json" : "tsconfig.next-dist.json";
}

/** @type {import('next').NextConfig} */
const distDir = resolveNextDistDir(process.env.M6_NEXT_DIST_DIR);
const nextConfig = {
  // Allows concurrent local Next dev servers to use independent build state.
  distDir,
  // Next adds generated route type paths to its active config. Keep custom dev dist paths out of tsconfig.json.
  typescript: { tsconfigPath: typescriptConfigPathForDistDir(distDir) },
  // Necesario para el build de Docker: genera un servidor "standalone"
  // con solo lo necesario para correr en producción. Vercel arma su propio
  // empaquetado y con "standalone" el build falla buscando
  // .next/next-server.js.nft.json, así que ahí se omite (VERCEL=1).
  output: process.env.VERCEL ? undefined : "standalone",
  // El servidor de desarrollo bloquea por defecto los recursos de HMR pedidos
  // desde un origen distinto al que abrió el navegador; Playwright navega a
  // 127.0.0.1 aunque el server escucha en localhost, así que sin esto el bundle
  // del cliente no termina de hidratar durante las pruebas E2E (#88).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Se oculta X-Powered-By (ZAP lo marca como divulgación de tecnología).
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: API_CSP }] },
    ];
  },
  turbopack: {
    // In git worktrees (.codex/worktrees/*), allow Turbopack to resolve outside the worktree to root node_modules
    ...(import.meta.dirname.includes("worktrees")
      ? { root: path.resolve(import.meta.dirname, "../../..") }
      : {}),
  },
};

export default nextConfig;
