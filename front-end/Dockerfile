# ---- Estágio 1: build do SPA (Vite) ----
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# As variáveis VITE_* são "assadas" no bundle em tempo de build.
# Passe VITE_API_BASE_URL = URL pública do servidor (ex.: http://192.168.0.50)
# porque partes do código montam URLs absolutas (imagens de /uploads, socket).
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_REDIRECT_URI
ARG VITE_GOOGLE_SCOPE
ARG VITE_CORPORATE_DOMAIN
ARG VITE_POWERBI_EMBED_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI \
    VITE_GOOGLE_SCOPE=$VITE_GOOGLE_SCOPE \
    VITE_CORPORATE_DOMAIN=$VITE_CORPORATE_DOMAIN \
    VITE_POWERBI_EMBED_URL=$VITE_POWERBI_EMBED_URL

RUN npm run build

# ---- Estágio 2: serve estático + reverse proxy ----
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
