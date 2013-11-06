FROM ubuntu:12.10
RUN apt-get update -qq
RUN apt-get install -q -y software-properties-common
RUN add-apt-repository -y ppa:chris-lea/node.js
RUN apt-get update -qq
RUN apt-get install -q -y nodejs
RUN apt-get install -q -y build-essential python git libdbus-1-dev libglib2.0-dev
ADD . /ahola
WORKDIR /ahola
RUN npm install
EXPOSE 53/udp
CMD ["/ahola/bin/ahola"]