var express = require('express');
var argv = require('optimist').argv;
var bodyparser = require('body-parser');

/* 
  Do not initialize directly.  Use webserver.getInstance()
  Params:
     --sparrowSmsReceivePort=8765
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
  listenOnPath: function (_path, _method, _callback) {
     this._express.use(bodyparser.urlencoded({ extended: false }))
     this._express.use(bodyparser.json())
     this._express.use(bodyparser.json({ type: 'application/vnd.api+json' }))
    if (_method === 'get' || _method === 'post') {
        if (_method === 'get') {
            this._express.get(_path, _callback);
        } else if (_method === 'post') {
            this._express.post(_path, _callback);
        }
        process.stderr.write(
          'listening for path: ' + _path + '\n');
        if (this._numListeners++ == 0) {
          this._express.listen(this._port);
          process.stderr.write(
            'listening on port ' + this._port + '\n');
        }
    } else {
        console.log('Unknown method: ', _method, 'for path: ', _path);
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

