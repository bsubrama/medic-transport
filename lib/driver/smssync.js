var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var argv = require('optimist').argv;

/* Usage:
   nodejs examples/driver-smssync-send.js --secret=<token> \
       --port=8765

   nodejs examples/driver-smssync-receive.js --secret=<token> \
       --port=8765
*/

/**
 * @namespace smssync:
 */
exports.prototype = {

  /**
   * @name initialize:
   *   Perform device-specific or API-specific initialization.
   */
  initialize: function (_options) {
    this._options = (_options || {});
    this._secret = argv.secret || 'invalid';
    this._receivePort = argv.port || 8765;
    this._express = express();
    this._express.use(bodyParser.urlencoded({ extended: false }))
    this._express.use(bodyParser.json())
    this._express.use(bodyParser.json({ type: 'application/vnd.api+json' }))
    return this;
  },

  /**
   * @name send:
   *   Send a new message. The `_message` argument must be an object,
   *   containing at least a `to` property (set to the phone number or
   *   MSISDN of the intended recipient), and a `content` property
   *   (containing the message body, encoded as utf-8 text).
   *
   *   After the message has been successfully transmitted, the
   *   `_callback(_err, _result)` function will be invoked with two
   *   arguments -- `_err` will be a node.js-style error object (or
   *   false-like if no error occurred). THe `_result` argument will be
   *   an object containing, at a minimum, a single `result` property
   *   set to either `success`, `partial`, or `failure`. A result of
   *   `partial` indicates that the message was too large for a single
   *   message, had to be fragmented, and one or more of the fragments
   *   failed to send properly.
   *
   *   This function should return the driver instance in `this`.
   */
  send: function (_message, _callback) {

    if (this._options.debug) {
      process.stderr.write(
        'smssync driver: sent ' + JSON.stringify(_message) + '\n'
      );
    }

    _callback.call(
      this, null, { status: 'success' }
    );

    return this;
  },

  /**
   * @name register_receive_handler:
   *   Ask the driver to invoke `_callback` whenever a message arrives.
   *   The `_handler(_message, _callback)` function will be invoked
   *   for each message received: the `_err` argument is a node.js-style
   *   error object (or false-like if the operation was successful); the
   *   `_message` argument is an object containing at least the `from`,
   *   `timestamp`, and `content` properties; the `_callback(_err)` argument
   *   is a function that must be called by our instansiator once the
   *   message has been safely written to persistent storage. If for some
   *   reason our instansiator cannot accept the message, the function
   *   should still be called, but the `_err` parameter set to a non-null
   *   error object.
   */
  register_receive_handler: function (_handler) {
    expectedSecret = this._secret
    this._express.post('/api/v1/transport/smssync', function(req, res) {
      var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
      success = false;
      error = null;
      from = req.body.from
      if (!from) {
        error = "<from> field is empty."
      }

      message = req.body.message
      if (!message) {
        error = 'The message variable was not set';
      }

      secret = req.body.secret
      sent_timestamp = req.body.sent_timestamp
      sent_to = req.body.sent_to
      message_id = req.body.message_id
      device_id = req.body.device_id

      if (from && message && sent_timestamp && message_id) {
        if (secret == expectedSecret) {
            success = true;
            _handler({from: from, timestamp: sent_timestamp, content: message},
                 function (_err) {
                   if (_err) {
                     console.log(_err) 
                   }
                 });
        } else {
            error = "The secret value sent from the device does not match the one on the server";
        }
      }
      response = JSON.stringify({"payload" : {"success" : success, "error" : error}}) 
      res.set('Cache-Control', 'no-cache, must-revalidate')
      res.set('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
      res.set('Content-Type', 'text/plain');
      res.send(response)
    });
    this._express.listen(this._receivePort);
    return this;
  },

  /**
   * @name register_error_handler:
   *   Ask the driver to invoke `_handler(_err)` whenever an error occurs
   *   that cannot be attributed to a requested `send` operation. The
   *   `_err` argument will contain a node.js-style error object, and
   *   should never be null.
   */
  register_error_handler: function (_handler) {

    return this;
  },

  /**
   * @name start:
   *   Start any polling and/or watch operations that are required
   *   for this driver instance to function properly. To avoid data
   *   loss, this function *must* be called after you've registered
   *   callback functions via the `register_receive_handler` and
   *   `register_error_handler` methods.
   */
  start: function () {

    return this;
  },

  /**
   * @name stop:
   *   Stop any polling and/or watch operations that are currently
   *   running on behalf of this driver instance.
   */
  stop: function () {
    this._express.close();
    return this;
  },

  /**
   * @name destroy:
   *   Release any and all resources held by this driver.
   */
  destroy: function () {

    return this.stop();
  }

};

