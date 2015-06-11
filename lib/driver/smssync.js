var dequeue = require('dequeue')
var uuid = require('uuid')
var webserver = require('../webserver');

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
    this._send = {
        // Number of retries.
        _max_retries: 3,
        // Timeout before rescheduling the message for delivery again.
        _retry_timeout_ms: 120000,
        // Temporarily store messages to be sent by UUID as a dequeue. No notion of priority.
        // Entries removed from head of dequeue upon call to POST ?task=send and moved to
        // _pending_responses.
        _queue: new dequeue(),
        // Messages pending response from gateway. These will be excluded from the
        // response to POST ?task=send. When the gateway responds with an entry in this
        // list, it is removed from here and the callback is executed. When a timeout is hit,
        // the entry is inserted to the head of _requests if the number of retries has not hit
        // maximum. If max retries have been reached, it is removed and the callback is executed
        // as an error.
        _pending_response: {}
    }

	this._receivePort = argv.sparrowSmsReceivePort || 8765;
    this._webserver = webserver.getInstance();
    this._webserver.listenOnPath('/smssync')

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
    // Take every message and schedule for delivery by enqueueing in dequeue.
    this._send._queue.push({
        message: _message,
        callback: _callback,
        retries: 0,
        uuid: uuid.v4()
    });

    if (this._options.debug) {
      process.stderr.write(
        'smssync driver: scheduled ' + JSON.stringify(_message) + '\n'
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

