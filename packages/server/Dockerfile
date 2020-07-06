FROM node:14

WORKDIR /root
ADD package.json /root/
RUN yarn

ADD . /root

CMD yarn prod