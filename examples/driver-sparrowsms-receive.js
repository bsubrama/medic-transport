
var driver = require('../lib/driver');

/**
 * @name test_sparrowsms_receive:
 */

var test_sparrowsms_receive = function () {
  var d = driver.create('sparrowsms');

  d.register_receive_handler(function (_message, _callback) {
    console.log('** driver receive: ', JSON.stringify(_message));
    return _callback();
  });

  d.start();
};

test_sparrowsms_receive();

