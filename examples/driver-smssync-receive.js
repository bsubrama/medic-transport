
var driver = require('../lib/driver');

/**
 * @name test_smssync_receive:
 */

/*
 * Curl commands:
 * curl -s http://localhost:8765/api/v1/transport/smssync --data "from=medic-mobile&message=hello&secret=123456&sent_timestamp=now&sent_to=medic-mobile&message_id=1&device_id=0"
 * curl -s http://localhost:8765/api/v1/transport/smssync --data "from=medic-mobile&message=&secret=123456&sent_timestamp=now&sent_to=medic-mobile&message_id=1&device_id=0"
 */

var test_smssync_receive = function () {
  var d = driver.create('smssync');

  d.register_receive_handler(function (_message, _callback) {
    console.log('** driver receive: ', JSON.stringify(_message));
    return _callback();
  });

  d.start();
};

test_smssync_receive();

