# File Server - NestJS

### Descrição
Este repositório contém um servidor de arquivos (File Server) desenvolvido em **NestJS**, integrado com um sistema de incentivo fiscal desenvolvido em **CodeIgniter 4** e **Vue 3**. Ele utiliza o **AWS S3** para armazenamento de arquivos e **MySQL** como banco de dados relacional.

### Pré-requisitos

- **Node.js** (v16+)
- **NestJS CLI** (instalado globalmente com `npm i -g @nestjs/cli`)
- **MySQL** 
- **Conta AWS** com acesso ao **S3**

### Instalação

1. Clone o repositório:
   ```bash
   git clone <url-do-repositório>
   cd file_server
   
2. Instale as dependências:
   ```bash
   npm install

3. Configure o arquivo .env:
   ```bash
   PORT=3005
   AWS_ACCESS_KEY_ID=seu-acesso
   AWS_SECRET_ACCESS_KEY=sua-chave-secreta
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=nome-do-bucket

   MYSQL_HOST='localhost'
   MYSQL_USER='root'
   MYSQL_PASS='senha-mysql'
   MYSQL_DATABASE='nome-do-banco'

### Estrutura do Projeto

- **src/**: Contém o código-fonte principal da aplicação.
- **test/**: Inclui os testes unitários e end-to-end (e2e).
- **dist/**: Diretório com o código compilado para o ambiente de produção.

### Tecnologias Utilizadas

- **NestJS**: Framework utilizado para o desenvolvimento da API.
- **TypeORM**: ORM para manipulação e interação com o banco de dados MySQL.
- **AWS SDK**: Biblioteca para interação com os serviços da AWS, como o S3.
- **Multer-S3**: Middleware para fazer upload de arquivos diretamente no S3 da AWS.
- **Jest**: Framework para a criação e execução de testes.

### Variáveis de Ambiente

- **PORT**: Porta na qual o servidor será executado.
- **AWS_ACCESS_KEY_ID**: Chave de acesso para autenticação na AWS.
- **AWS_SECRET_ACCESS_KEY**: Chave secreta utilizada para autenticação na AWS.
- **AWS_REGION**: Região da AWS onde os serviços estão hospedados.
- **AWS_S3_BUCKET_NAME**: Nome do bucket no S3 para armazenamento de arquivos.
- **MYSQL_HOST**: Host do banco de dados MySQL.
- **MYSQL_USER**: Usuário do banco de dados MySQL.
- **MYSQL_PASS**: Senha do banco de dados MySQL.
- **MYSQL_DATABASE**: Nome do banco de dados MySQL.

### Licença

Este projeto está licenciado como **UNLICENSED**. Uso privado e restrito.





