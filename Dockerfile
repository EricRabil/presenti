FROM node:14

WORKDIR /root
ADD . /root

RUN yarn cache clean --all
RUN yarn
RUN yarn build:ts