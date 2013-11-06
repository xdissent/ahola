module.exports = function (port, addr, servers) {

  if (!servers) servers = ['8.8.8.8', '4.4.4.4'];

  var dnsserver = require('dnsserver'),
    dgram = require('dgram'),
    dbus = require('node-dbus');

  var server = dnsserver.createServer(),
    pending = {},
    proxy = server.proxy = dgram.createSocket('udp4');

  server.on('request', function (req, res) {

    var question = req.question;

    console.log('request', req.msg.readUInt16LE(0));

    if (question.type == 1 && question.class == 1 && question.name.match(/\.local$/)) {

      var dbusMsg = Object.create(dbus.DBusMessage, {
        destination: {value: 'org.freedesktop.Avahi'},
        path: {value: '/'},
        iface: {value: 'org.freedesktop.Avahi.Server'},
        member: {value: 'ResolveHostName'},
        bus: {value: dbus.DBUS_BUS_SYSTEM},
        type: {value: dbus.DBUS_MESSAGE_TYPE_METHOD_RETURN}
      });

      dbusMsg.appendArgs('iisiu', -1, 0, question.name, 0, 0);

      dbusMsg.on('methodResponse', function (iface, proto, name, aproto, ip, flags) {
        res.addRR(question.name, 1, 1, 600, ip);
        res.send();
      });

      dbusMsg.on('error', function (err) {
        res.header.rcode = 3;
        res.send();
      });

      return dbusMsg.send();
    }

    var id = req.msg.readUInt16LE(0).toString(),
      errors = [],
      send = function (server) {
        proxy.send(req.msg, 0, req.msg.length, 53, servers[server], function (err, bytes) {
          if (!err) return;
          server = server + 1;
          errors.push(err);        
          if (server === servers.length) {
            throw new Error('Exhausted servers:\n' + errors.join('\n'));
          }
          send(server);
        });
      };

    pending[id] = res;
    send(0);
  });

  proxy.on('message', function (msg, sender) {
    var id = msg.readUInt16LE(0).toString(), res = pending[id];
    console.log('message', id);
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

  server.bind(port || 53, addr || '0.0.0.0');
  proxy.bind(0, addr || '0.0.0.0');
  return server;
};