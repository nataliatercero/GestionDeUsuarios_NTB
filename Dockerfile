# ── Etapa base ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

# Copiar manifiestos primero para aprovechar la caché de capas
COPY package*.json ./

# ── Etapa de producción ──────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 3000

# Usar node directamente (no npm) para que SIGTERM llegue al proceso
CMD ["node", "src/index.js"]
