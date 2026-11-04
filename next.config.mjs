import path from "node:path";

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
  turbopack: {
    // In git worktrees (.codex/worktrees/*), allow Turbopack to resolve outside the worktree to root node_modules
    ...(import.meta.dirname.includes("worktrees")
      ? { root: path.resolve(import.meta.dirname, "../../..") }
      : {}),
  },
};

export default nextConfig;
