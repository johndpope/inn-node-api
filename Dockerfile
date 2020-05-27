FROM node:10
WORKDIR /usr/src/app
COPY . . 
RUN npm install
EXPOSE 8080
CMD [ "node", "--max-old-space-size=3072 server.js" ]
