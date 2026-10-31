FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
RUN mkdir -p uploads
ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/index.js"]
