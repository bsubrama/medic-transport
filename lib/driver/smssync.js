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
    this._secret = "secret-key-here";
    this._send_params = {
        // Number of messages to retrieve per request to POST ?task=send.
        _messages_per_request: 10,
        // Number of enqueue retries.
        _max_enqueue_retries: 3,
        // Timeout before rescheduling the message for delivery to SMSSync again.
        _enqueue_retry_timeout_ms: 120000,
        // Timeout for receiving delivery report from SMSSync.
        _delivery_report_timeout_ms: 120000,
        // Temporarily store messages to be sent by UUID as a dequeue. No notion of priority.
        // Entries removed from head of dequeue upon call to POST ?task=send and moved to
        // _pending_responses.
        _queue: new dequeue(),
        // Messages pending enqueue confirmation from gateway. These will be excluded from the
        // response to POST ?task=send. When the gateway responds with an entry in this
        // list, it is removed from here and moved to _pending_delivery_confirmation. When a
        // timeout is hit, the entry is inserted to the head of _requests if the number of
        // retries has not hit maximum. If max retries have been reached, it is removed and the
        // callback is executed as an error.
        _pending_enqueue_confirmation: []
        // Messages pending delivery confirmation from gateway. When the gateway responds with an
        // entry in this list, it is removed from here and the callback is executed. When a timeout
        // is hit, the entry is inserted to the head of _requests if the number of retries has not hit
        // maximum. If max retries have been reached, it is removed and the callback is executed
        // as an error.
        _pending_delivery_confirmation: []
    }

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
    // Take every message and schedule for delivery.
    var msg_uuid = uuid.v4();
    this._send_params._queue.push({
        to: _message.to,
        content: _message.content,
        callback: _callback,
        retries: 0,
        uuid: msg_uuid
    });

    if (this._options.debug) {
      process.stderr.write(
        'smssync driver: scheduled ' + msg_uuid +
        ': ' + JSON.stringify(_message) + '\n'
      );
    }

    return this;
  },
  
  _send_handler: function (_request, _response) {
      var messages = []
      var uuids = []
      for (var i = 0; i < this._send_params._messages_per_request; ++i) {
          var message = this._send_params._queue.shift();
          messages.push({
              to: message.to,
              message: message.content,
              uuid: message.uuid,
          });
          uuids.push(message.uuid);
          this._send_params._pending_enqueue_response[message.uuid] = message;
      }
      
      // Add a timeout for when SMSSync doesn't respond with a timely
      // POST ?task=sent call to inform about messages enqueued for sending.
      setTimeout(this._send_params._enqueue_retry_timeout_ms, function() {
          for (var uuid in uuids) {
              if (uuid in this._send_params._pending_enqueue_response) {
                  var message = this._send_params._pending_enqueue_response[uuid];
                  message.retries += 1;
                  if (message.retries < this._send_params._num_enqueue_retries) {
                      this._send_params._queue.unshift(message);
                  } else {
                      /* fire callback with appropriate error */
                  }
                  // Remove the entry
                  delete this._send_params._pending_enqueue_response[uuid];
              }
          }
      });
      
      response.json({
          payload: {
              task: 'send',
              secret: this._secret,
              messages: messages
          }
      });
      return this;
  },
  
  _sent_handler: function (_request, _response) {
      if (_request.body.queued_messages) {
          var uuids = []
          for (var uuid in  _request.body.queued_messages) {
              if (uuid in this._send_params._pending_enqueue_response) {
                  // Move the entry to the _pending_delivery_response array.
                  this._send_params._pending_delivery_response[uuid] =
                      this._send_params._pending_enqueue_response[uuid];
                  // Remove the entry
                  delete this._send_params._pending_enqueue_response[uuid];
                  uuids.push(uuid);
              }
          }
          
          // Add a timeout for when SMSSync doesn't respond with a timely
          // GET ?task=result call to send delivery reports.
          setTimeout(this._send_params._delivery_retry_timeout_ms, function () {
              for (var uuid in uuids) {
                  if (uuid in this._send_params._pending_delivery_response) {
                      var message = this._send_params._pending_delivery_response[uuid];
                      // TODO(bsubrama) Fire callback reporting unknown delivery status.
                      // Remove the entry
                      delete this._send_params._pending_delivery_response[uuid];
                  }
              }
          })
          
          // TODO(bsubrama): Remove from _queue as well if the sent response
          // has been delayed.
          _response.json({
              message_uuids: _request.body.queued_messages
          });
      }
  },
  
  _result_get_handler: function (_request, _response) {
      _response.json({
          message_uuids: Object.keys(this._send_params._pending_delivery_response)
      });
  },
  
  _result_post_handler: function(_request, _response) {
      if (_request.body.message_result) {
          for (var result in _request.body.message_result) {
              var message = this._send_params._pending_delivery_response[result.uuid];
              message.callback.call(/*call with success response */);
              // Remove the entry
              delete this._send_params._pending_delivery_response[uuid];
          }
      }
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
    webserver.listenOnPath('/smssync', 'get', function(request, response) {
        if (request.query.task === 'send') {
            this._send_handler(request, response);
        } else if (request.query.task === 'result') {
            this._result_get_handler(request, response);
        } else {
            console.log('** Unsupported task ', request.query.task);
            response.statusCode(400);
        }
    });

    webserver.listenOnPath('/smssync', 'post', function(request, response) {
        if (request.query.task === 'sent') {
            this._sent_handler(request, response);
        } else if (request.query.task === 'result') {
            this._result_post_handler(request, response);
        } else {
            console.log('** Unsupported task ', request.query.task);
            response.statusCode(400);
        }
    });
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

