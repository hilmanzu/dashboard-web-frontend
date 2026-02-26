# Stage 1 - Build
FROM node:20-alpine as builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build


# Stage 2 - Production
FROM node:20-alpine

WORKDIR /app

ENV PORT=5002

COPY --from=builder /app ./

EXPOSE 5002

CMD ["npm", "start"]