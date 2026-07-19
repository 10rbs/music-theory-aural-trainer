# Build stage: install, test, build static site
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Self-hosted image serves at the domain root, not the GitHub Pages subpath
ENV VITE_BASE=/
RUN npm run test && npm run build

# Serve stage: static files behind nginx
# (vendor-agnostic escape hatch — primary deploy is GitHub Pages)
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
