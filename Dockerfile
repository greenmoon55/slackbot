FROM daocloud.io/node:latest
COPY package.json /src/package.json
RUN cd /src; npm install

# Bundle app source
COPY . /src

ENV DAOCLOUD_TOKEN DAOCLOUD_TOKEN
ENV SLACK_CHANNEL_ID SLACK_CHANNEL_ID
ENV SLACK_TOKEN_ID SLACK_TOKEN_ID

EXPOSE 3000
CMD ["node", "/src/main.js"]
