FROM node:16
WORKDIR '/app'

ARG AXIOS_BASEURL='http://localhost:8080/api/v2'
ENV AXIOS_BASEURL $AXIOS_BASEURL

COPY package.json .
COPY package-lock.json .
RUN npm ci
COPY . .
CMD ["npm", "start"]

