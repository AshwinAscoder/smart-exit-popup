FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8081

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

# CRITICAL FIX: Run prisma generate before building the server production build
RUN npx prisma generate

# NEW PRODUCTION INJECTION: Force push structure definitions right into your online atlas
RUN npx prisma db push --accept-data-loss

RUN npm run build
RUN npm prune --omit=dev && npm cache clean --force

EXPOSE 8081

CMD ["npm", "run", "start"]
