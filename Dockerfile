# Etapa 1: Construir a imagem com as dependências
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm install -g ts-node-dev


WORKDIR /app

CMD ["ts-node-dev", "--respawn", "--transpile-only", "src/main.ts"]