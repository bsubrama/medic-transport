var request = require('request');
var webserver = require('../webserver');
var argv = require('optimist').argv;

/* Usage:
   nodejs examples/driver-sparrowsms.js --sparrowSmsApiToken=<token> \
       --sparrowSmsFrom=<from> --sparrowSmsReceivePort=8765
*/

/**
 * @namespace abstract:
 */
exports.prototype = {

  /**
   * @name initialize:
   *   Perform device-specific or API-specific initialization.
   */
  initialize: function (_options) {

    this._options = (_options || {});
    this._sendEndpoint = "http://api.sparrowsms.com/v2/sms";
    this._receivePath = '/api/v1/transport/sparrowsms';
    this._token = argv.sparrowSmsApiToken || "unknown_api_token";
    this._from = argv.sparrowSmsFrom || "unknown-from";
    this._receiveHandlers = [];
    this._errorHandlers = [];
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
	  var params = {
		  token: this._token,
		  from: this._from,
		  to: _message.to,
		  text: _message.content
	  	  };
	  var url = this._sendEndpoint + "?" + Object.keys(params).map(function(key){
		  return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]); 
	  }).join('&');
	  request({
		  url: url,
		  method: 'GET'
	  },
	  function (error, response, body) {
		  var result = {
			  status: 'success',
		  }
	      if (!error) {
			  if (response.statusCode == 200) {
				  var content = JSON.parse(body);
				  _callback.call(this, null, result);
				  // NOTE: there is no way to know partial
				  // failure with SparrowSMS.
			  } else {
				  var node_error = new Error(body);
				  result.status = 'failure';
				  _callback.call(this, node_error, result);
			  }
	      } else {
			  var node_error = new Error(error);
			  result.status = 'failure';
			  _callback.call(this, node_error, result);
	      }
	  });

	if (this._options.debug) {
	  process.stderr.write(
	    'sparrowsms driver: sent ' + JSON.stringify(_message) + '\n'
	  );
	}

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
    this._receiveHandlers.push(_handler);
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
    this._errorHandlers.push(_handler);
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
    webserver.listenOnPath(this._receivePath, 'post',
        function(req, res) {
          from = req.query.from; // sms sender
          // Should include? to = req.query.to; // shortcode
          // Should include? keyword = req.query.keyword; // first word
          text = req.query.text; // the complete text
          timestamp = time();
          for (var i = 0; i < this._receiveHandlers.length; i++) {
            var handler = this._receiveHandlers[i];
            handler_({from: from, timestamp: timestamp, content: text},
                function(err) {
                  // TODO(lindahl): What can we do with this error?  Retry?
                });
          }
          // No response (we don't want to send an SMS message back)
        });
    return this;
  },

  /**
   * @name stop:
   *   Stop any polling and/or watch operations that are currently
   *   running on behalf of this driver instance.
   */
  stop: function () {
    webserver.stopListeningOnPath(this._receivePath);
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

