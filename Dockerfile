FROM node:20-alpine

COPY src /app/src/
COPY package.json /app/
COPY package-lock.json /app/

WORKDIR /app

RUN npm ci

CMD [ "./src/main.mjs" ]