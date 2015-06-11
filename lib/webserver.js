var express = require('express');
var argv = require('optimist').argv;

/* 
  Do not initialize directly.  Use webserver.getInstance()
  Params:
     --sparrowSmsReceivePort=8765
*/


// TODO(lindahl): How do I limit where you can instantiate from?
/**
 * @namespace abstract:
 */
exports.prototype = {

  /**
   * @name initialize:
   *   Initializes object state.
   */
  initialize: function (_options) {
    this._options = (_options || {});
    this._port = argv.webserverPort || 8765;
    this._numListeners = 0;
    this._express = express();
    return this;
  },

  /**
   * @name listenOnPath:
   *   Registers a get listener.  _callback takes an express request
   *   and response.  See http://expressjs.com/api.html#req
   */
  listenOnPath: function (_path, _callback) {
    this._express.get(_path, _callback);
    this._express.post(_path, _callback);
    if (this._options.debug) {
      process.stderr.write(
        'listening for path: ' + _path);
    }
    if (this._numListeners++ == 0) {
      this._express.listen(this._port);
      if (this._options.debug) {
        process.stderr.write(
          'listening on port ' + this._port);
      }
    }
    return this;
  },

  /**
   * @name stopListeningOnPath:
   *   Stop the web server.
   */
  stopListeningOnPath: function (path) {
    // TODO(lindahl): Unregister listener
    if (--this._numListeners == 0) {
      this._express.close();
    }
    return this;
  },

};

var singleton = null;
exports.getInstance = function() {
  if (singleton == null) {
    singleton = new exports();
  }
}
