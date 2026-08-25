# --- deps & build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# --- production dependencies stage ---
FROM node:20-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src/db/prisma ./src/db/prisma
RUN npx prisma generate

# --- final runtime image ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY src/db/prisma ./src/db/prisma

EXPOSE 8080

# Migrations are NOT run automatically on container start. Run them
# explicitly as a separate deploy step, e.g.:
#   docker run --rm <image> npm run db:migrate
CMD ["node", "dist/index.js"]
