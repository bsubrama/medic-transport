var express = require('express');
var argv = require('optimist').argv;
var bodyparser = require('body-parser');

/* 
  Command-line arguments:
     --webserverPort=8765
*/

// TODO(lindahl): How do I limit where you can instantiate from?
module.exports = {

  _port: argv.webserverPort || 8765,
  _numListeners: 0,
  _express: express(),

  /**
   * @name listenOnPath:
   *   Registers a get listener.  _callback takes an express request
   *   and response.  See http://expressjs.com/api.html#req
   */
  listenOnPath: function (_path, _methods, _callback) {
    this._express.use(bodyparser.urlencoded({ extended: false }))
    this._express.use(bodyparser.json())
    this._express.use(bodyparser.json({ type: 'application/vnd.api+json' }))
    _methods = [].concat(_methods);
    for (var i = 0; i < _methods.length; i++) {
      var method = _methods[i];
      switch (method) {
        case 'get':
          this._express.get(_path, _callback);
          break;
        case 'post':
          this._express.post(_path, _callback);
          break;
        default:
          console.log('Unknown method: ', method, 'for path: ', _path);
          continue;
      }
      process.stderr.write('listening for ' + method + ' on path: ' + _path + '\n');
    }
    if (this._numListeners++ == 0) {
      this._express.listen(this._port);
      process.stderr.write(
        'listening on port ' + this._port + '\n');
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

