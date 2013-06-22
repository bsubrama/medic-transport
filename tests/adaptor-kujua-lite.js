
var adaptor = require('../lib/adaptor');

/**
 * @name test_kujua_lite:
 */

var test_kujua_lite = function () {

  var a = adaptor.create('kujua-lite', {
    debug: true, pass: process.argv[2],
    url: 'http://dev.medicmobile.org:5984/kujua-lite/_design/kujua-lite/_rewrite'
  });

  a.register_transmit_handler(function (_message, _callback) {
    console.log('** driver transmit: ', JSON.stringify(_message));
    return _callback(false, {});
  });

  a.start();

  var message = {
    from: '+15155551212', content: '1!ZZZZ!1#1#1'
  };

  a.deliver(message, function (_err) {
    console.log('** delivered: ', JSON.stringify(message));
  });

};

if (process.argv.length <= 2) {
  process.stderr.write('Usage: ' + process.argv[1] + ' [password]\n');
  process.exit(1);
}

test_kujua_lite();

