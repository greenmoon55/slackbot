FROM daocloud.io/node:latest
COPY package.json /src/package.json
RUN cd /src; npm install

# Bundle app source
COPY . /src

EXPOSE 3000
CMD ["node", "/src/main.js"]
