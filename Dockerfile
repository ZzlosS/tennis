FROM node:18-alpine3.15

WORKDIR /usr

COPY package.json ./
COPY tsconfig.json ./
COPY tsoa.json ./
COPY src ./src
COPY env ./env

RUN ls -a

RUN npm install
RUN npm run build

EXPOSE 4005

CMD ["npm","run","dev"]