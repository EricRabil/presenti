FROM node:14

WORKDIR /root
ADD package.json /root/
RUN yarn

ADD . /root
RUN yarn build:prod

CMD yarn prod