FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8081

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build
RUN npm prune --omit=dev && npm cache clean --force

EXPOSE 8081

CMD ["npm", "run", "start"]
