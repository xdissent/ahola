# Run with -v /var/run/dbus:/run/dbus
FROM ubuntu:12.10
MAINTAINER Greg Thornton <xdissent@me.com>
RUN apt-get update -qq
RUN apt-get install -q -y software-properties-common
RUN add-apt-repository -y ppa:chris-lea/node.js
RUN apt-get update -qq
RUN apt-get install -q -y nodejs
RUN apt-get install -q -y build-essential python git libdbus-1-dev libglib2.0-dev
RUN git clone https://github.com/xdissent/ahola.git
WORKDIR /ahola
RUN npm install
EXPOSE 53/udp
CMD ["bin/ahola"]