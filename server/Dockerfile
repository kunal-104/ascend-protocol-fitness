FROM node:22-slim
WORKDIR /repo
ENV NODE_ENV=production
# Install only the server and core workspaces (the mobile app is not needed on the server).
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY server/package.json server/
# The app manifest is copied only so the lockfile matches the workspace list; its deps are not installed.
COPY app/package.json app/
RUN npm ci --workspace @ascend/server --include-workspace-root=false --omit=dev
COPY packages/core packages/core
COPY server server
WORKDIR /repo/server
EXPOSE 4000
CMD ["sh", "-c", "npx tsx src/db/migrate.ts && npx tsx src/index.ts"]
