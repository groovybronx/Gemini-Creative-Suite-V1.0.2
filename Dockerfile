# Étape 1: Construire l'application
FROM node:18-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json et package-lock.json
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers de l'application
COPY . .

# Construire l'application
RUN npm run build

# Étape 2: Servir l'application
FROM node:18-alpine

WORKDIR /app

# Copier uniquement les artefacts de construction et les dépendances de production
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/dist ./dist

RUN npm install

# Exposer le port
EXPOSE 4173

# Commande pour démarrer l'application
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]