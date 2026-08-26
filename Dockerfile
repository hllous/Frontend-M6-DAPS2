# ──────────────────────────────────────────────────────────────
# M6 Ambiente Frontend — Imagen Docker (Next.js, standalone)
# Build multi-stage: deps (instala) -> builder (compila) -> runner (liviana).
# ──────────────────────────────────────────────────────────────

# ─── Etapa 1: deps (instalación de dependencias) ─────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Solo manifiestos para aprovechar la caché de Docker.
COPY package.json package-lock.json ./
RUN npm ci

# ─── Etapa 2: builder (compilación de Next.js) ───────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Reutiliza node_modules de la etapa deps.
COPY --from=deps /app/node_modules ./node_modules

# Copia el resto del código fuente (respeta .dockerignore).
COPY . .

# Compila la app y genera el servidor standalone (.next/standalone).
RUN npm run build

# ─── Etapa 3: runner (imagen final, liviana) ─────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# El standalone ya trae su propio node_modules mínimo + server.js.
COPY --from=builder /app/.next/standalone ./

# Los assets estáticos NO están incluidos en standalone: se copian aparte.
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Bind a 0.0.0.0 para que sea accesible desde fuera del contenedor.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
