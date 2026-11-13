FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de

# A imagem gera o conf.d/default.conf a partir do template ao subir. O filtro limita a troca a
# estas variáveis, para o envsubst não tocar nas do nginx ($host, $uri...).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY cabecalhos-seguranca.conf /etc/nginx/snippets/cabecalhos-seguranca.conf
# Os .envsh de /docker-entrypoint.d rodam em ordem antes do envsubst (o 20-), e só se executáveis.
COPY --chmod=755 api-url-sem-barra.envsh /docker-entrypoint.d/16-api-url-sem-barra.envsh
ENV PORT=80 \
    API_URL=http://backend:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER="^(PORT|API_URL|NGINX_LOCAL_RESOLVERS)$"
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
