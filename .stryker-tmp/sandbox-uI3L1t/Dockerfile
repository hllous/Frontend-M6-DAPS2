# ──────────────────────────────────────────────────────────────
# M6 Ambiente Frontend — Imagen Docker (Next.js, standalone)
# Build multi-stage: deps (instala) -> builder (compila) -> runner (liviana).
# ──────────────────────────────────────────────────────────────

# ─── Etapa 1: deps (instalación de dependencias) ─────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Solo manifiestos para aprovechar la caché de Docker.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# ─── Etapa 2: builder (compilación de Next.js) ───────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Reutiliza node_modules de la etapa deps.
COPY --from=deps /app/node_modules ./node_modules

# Copia el resto del código fuente (respeta .dockerignore).
COPY . .
RUN corepack enable

# Compila la app y genera el servidor standalone (.next/standalone).
RUN pnpm build

# ─── Etapa 3: runner (imagen final, liviana) ─────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# El CMD es `node server.js`: npm, npx, corepack y yarn no se usan en runtime.
# Se eliminan (no se ocultan en .trivyignore) porque el npm embebido en la imagen
# base trae CVE HIGH propias (brace-expansion, pacote, sigstore, etc.).
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-*     /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack     /usr/local/bin/yarn /usr/local/bin/yarnpkg

# El standalone ya trae su propio node_modules mínimo + server.js.
# --chown: el usuario no-root `node` necesita escribir en /app (p. ej. .next/cache).
COPY --from=builder --chown=node:node /app/.next/standalone ./

# Los assets estáticos NO están incluidos en standalone: se copian aparte.
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# No correr como root (Trivy DS-0002).
USER node

# Bind a 0.0.0.0 para que sea accesible desde fuera del contenedor.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
