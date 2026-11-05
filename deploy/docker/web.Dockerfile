FROM node:22-bookworm-slim AS pc-builder

ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG PUBLIC_HOST=203.0.113.10
ARG PUBLIC_PORT=18080
ENV NODE_OPTIONS=--max-old-space-size=768

WORKDIR /app/front-pc
COPY front-pc/package.json front-pc/package-lock.json ./
RUN npm ci --registry=${NPM_REGISTRY}
COPY front-pc/ ./
RUN VITE_CUSTOMER_ORDER_BASE_URL="http://${PUBLIC_HOST}:${PUBLIC_PORT}/phone" npm run build

FROM node:22-bookworm-slim AS phone-builder

ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV NODE_OPTIONS=--max-old-space-size=768

WORKDIR /app/front-phone
COPY front-phone/package.json front-phone/package-lock.json ./
RUN npm ci --registry=${NPM_REGISTRY}
COPY front-phone/ ./
RUN VITE_BASE_PATH=/phone/ npm run build

FROM nginx:1.27-alpine AS runtime

COPY deploy/docker/nginx.canteen-test.conf /etc/nginx/conf.d/default.conf
COPY --from=pc-builder /app/front-pc/dist /usr/share/nginx/html
COPY --from=phone-builder /app/front-phone/dist /usr/share/nginx/phone

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
