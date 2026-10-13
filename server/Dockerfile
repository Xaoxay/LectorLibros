FROM node:22-bookworm-slim
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY src/textPagination.js /app/src/textPagination.js
ENV HOST=0.0.0.0 PORT=8787 DATA_DIRECTORY=/data
RUN mkdir -p /data && chown node:node /data
EXPOSE 8787
USER node
CMD ["node", "index.js"]
