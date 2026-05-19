FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY frontend/package*.json frontend/
COPY backend/package*.json backend/
COPY backend/tsconfig.json backend/

RUN npm ci --prefix frontend
RUN npm ci --prefix backend

COPY . .

RUN npm run build --prefix frontend
RUN npx prisma generate --schema=backend/src/prisma/schema.prisma
RUN npm run build --prefix backend

FROM node:20-alpine AS backend

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/src/prisma ./src/prisma
COPY --from=builder /app/frontend/dist ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
