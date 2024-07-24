# Etapa 1: Construir a imagem com as dependências
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Etapa 2: Criar a imagem final com o código de produção
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app ./

# Instalar dependências de desenvolvimento
RUN npm install --only=development

CMD ["npm", "run", "start:debug"]
