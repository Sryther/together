FROM node:8-alpine

WORKDIR /app

VOLUME /app

EXPOSE 8000
EXPOSE 1337

CMD node index.js
