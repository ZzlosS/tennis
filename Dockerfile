ARG NODE_IMAGE=node:22-bookworm-slim

# Build stage: compiles TypeScript, generates the Swagger spec and builds bcrypt's native module.
FROM ${NODE_IMAGE} AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsoa.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Runtime stage: production dependencies and the compiled app only.
FROM ${NODE_IMAGE}
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
EXPOSE 8787
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8787) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "build/server.js"]
