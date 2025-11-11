
# Instalar dependências do Chromium/Puppeteer
# Usar imagem oficial do Puppeteer que já inclui Chromium
FROM ghcr.io/puppeteer/puppeteer:21.6.0

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências Node.js
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar a aplicação
CMD ["node", "server.js"]
