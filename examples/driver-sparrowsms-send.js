
var driver = require('../lib/driver');

/**
 * @name test_sparrowsms_send:
 */

var test_sparrowsms_send = function () {
  var d = driver.create('sparrowsms');
  d.start();

  var message = {
    to: '9811685287', content: 'sapiMedic This is a test message'
  };

  d.send(message, function (_err, _result) {
    console.log('** sent: ', JSON.stringify(message), " result: ", _result, " error: ", _err);
  });	
};

test_sparrowsms_send();

