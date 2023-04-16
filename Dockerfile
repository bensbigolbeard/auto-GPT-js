# FROM python:3.11-slim
# ENV PIP_NO_CACHE_DIR=yes
WORKDIR /app
RUN npm install
COPY scripts/ .
ENTRYPOINT ["node", "dist/index.js"]