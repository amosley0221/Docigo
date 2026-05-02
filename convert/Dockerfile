# LibreOffice headless + a small Node service.
# Uses the slim Debian Node image and installs LibreOffice via apt.
FROM node:20-bookworm-slim

# LibreOffice + a couple of fonts so converted PDFs aren't full of
# Tofu blocks. --no-install-recommends keeps the image lean.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice \
        libreoffice-impress \
        fonts-liberation \
        fonts-dejavu \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests first for better layer caching.
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.js"]
