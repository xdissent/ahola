var dnsserver = require('dnsserver'),
  dgram = require('dgram'),
  dbus = require('node-dbus'),
  debug;

try {
  debug = require('debug')('ahola');
} catch (err) {
  debug = function () {};
}

module.exports = function ahola (config) {
  debug('aloha!');

  var server = dnsserver.createServer(),
    pending = {},
    proxy = server.proxy = dgram.createSocket('udp4');

  server.on('request', function (req, res) {
    var id = req.msg.readUInt16LE(0).toString(),
      name = req.question.name,
      type = req.question.type;

    debug('REQ', id, name, type, res.rinfo.address);

    if (type == req.question.class == 1 && /\.local$/.test(name)) {

      var dbusMsg = Object.create(dbus.DBusMessage, {
        address: {value: config.dbus},
        destination: {value: 'org.freedesktop.Avahi'},
        path: {value: '/'},
        iface: {value: 'org.freedesktop.Avahi.Server'},
        member: {value: 'ResolveHostName'},
        bus: {value: dbus.DBUS_BUS_SYSTEM},
        type: {value: dbus.DBUS_MESSAGE_TYPE_METHOD_RETURN}
      });

      dbusMsg.appendArgs('iisiu', -1, 0, name, 0, 0);

      dbusMsg.on('methodResponse', function (iface, proto, host, aproto, ip, flags) {
        debug('RES', id, name, 'dbus', ip);
        res.addRR(name, 1, 1, config.ttl, ip);
        res.send();
      });

      dbusMsg.on('error', function (err) {
        debug('RES', id, name, 'dbus', 'NXDOMAIN');
        res.header.rcode = 3;
        res.send();
      });

      return dbusMsg.send();
    }

    res.req = req;

    var errors = [],
      send = function (attempt) {
        var pieces = config.servers[attempt].split(':'),
          host = pieces[0],
          port = pieces.length > 1 ? pieces[1] : 53;

        proxy.send(req.msg, 0, req.msg.length, port, host, function (err, bytes) {
          if (!err) return;
          debug('ERR', id, name, host + ':' + port, attempt);
          attempt = attempt + 1;
          errors.push(err);        
          if (attempt === config.servers.length) {
            throw new Error('Exhausted servers:\n' + errors.join('\n'));
          }
          send(attempt);
        });
      };

    pending[id] = res;
    send(0);
  });

  proxy.on('message', function (msg, sender) {
    var id = msg.readUInt16LE(0).toString(),
      res = pending[id],
      name = res.req.question.name;

    debug('RES', id, name, 'proxy', sender.address);
    res.socket.send(msg, 0, msg.length, res.rinfo.port, res.rinfo.address, function (err, bytes) {
      if (err) throw err;
      delete pending[id];
    });
  });

  proxy.on('error', function (err) {
    throw err;
  });

  server.on('error', function (err) {
    throw err;
  });

  server.bind(config.port, config.host);
  proxy.bind(0, config.host);

  return server;
};