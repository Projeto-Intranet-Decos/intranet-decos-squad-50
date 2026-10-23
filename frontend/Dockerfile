FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM nginx:1.29-alpine

# A imagem gera o conf.d/default.conf a partir do template ao subir. O filtro limita a troca a
# estas variáveis, para o envsubst não tocar nas do nginx ($host, $uri...).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=http://backend:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER="^(API_UPSTREAM|NGINX_LOCAL_RESOLVERS)$"
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
