FROM node:22-bookworm-slim AS deps

ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
WORKDIR /app
RUN sed -i 's#deb.debian.org#mirrors.tencent.com#g; s#security.debian.org#mirrors.tencent.com#g' /etc/apt/sources.list.d/debian.sources
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --registry=${NPM_REGISTRY}

FROM deps AS build

COPY backend/ ./
RUN npm run prisma:generate && npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    TZ=Asia/Shanghai \
    PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

WORKDIR /app
RUN sed -i 's#deb.debian.org#mirrors.tencent.com#g; s#security.debian.org#mirrors.tencent.com#g' /etc/apt/sources.list.d/debian.sources
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates dumb-init openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY deploy/docker/backend-entrypoint.sh /usr/local/bin/canteen-backend-entrypoint.sh
COPY deploy/docker/normalize-merchant-user-uniques.cjs /usr/local/bin/canteen-normalize-merchant-user-uniques.cjs
COPY deploy/docker/seed-if-empty.cjs /usr/local/bin/canteen-seed-if-empty.cjs

RUN chmod +x /usr/local/bin/canteen-backend-entrypoint.sh \
    && groupadd --system canteen \
    && useradd --system --gid canteen --home-dir /app --shell /usr/sbin/nologin canteen \
    && chown -R canteen:canteen /app

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--", "canteen-backend-entrypoint.sh"]
CMD ["node", "dist/server.js"]
