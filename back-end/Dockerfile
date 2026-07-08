# ---- Back-end (Express + TypeScript via tsx) ----
FROM node:22-slim

WORKDIR /app

# Instala dependências primeiro (melhor cache de camadas)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código-fonte
COPY . .

# A aplicação escuta em 0.0.0.0:PORT (server.ts). Padrão do projeto: 5000.
ENV NODE_ENV=production
EXPOSE 5000

# tsx roda o TypeScript direto, sem etapa de build (tsc não tem outDir configurado)
CMD ["npx", "tsx", "server.ts"]
