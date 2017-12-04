FROM node:latest

WORKDIR /usr/src/app
COPY . ./
RUN npm install

ARG port=80
ENV PORT=$port
ENV BOOTSTRAP_FILE='./bootstrap-docker.json'

EXPOSE $port
COPY . .
CMD [ "node", "./index.js" ]