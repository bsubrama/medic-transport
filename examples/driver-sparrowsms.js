
var driver = require('../lib/driver');

/**
 * @name test_sparrowsms:
 */

var test_sparrowsms = function () {

  var d = driver.create('sparrowsms');

  d.register_receive_handler(function (_message, _callback) {
    console.log('** driver receive: ', JSON.stringify(_message));
    return _callback();
  });

  d.start();

  var message = {
    to: '9811685287', content: 'sapiMedic This is a test message'
  };

  d.send(message, function (_err, _result) {
    console.log('** sent: ', JSON.stringify(message), " result: ", _result, " error: ", _err);
  });	
};

test_sparrowsms();
