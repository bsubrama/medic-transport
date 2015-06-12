var chai = require('chai'),
    mockery = require('mockery'),
    request = require('request'),
    sinon = require('sinon'),
    driver = require('../../lib/driver.js'),
    assert = chai.assert;
chai.config.includeStack = true;

describe('sparrowsms', function() {
  'use strict';

  var TEST_MESSAGE = {to: '123456', content: 'Hello World'},
      TEST_URL_ROOT = 'http://localhost/nonsense',
      TEST_CALLBACK_OBJ = {url:'http://localhost:5999/weird-callback',
          headers:{}, body:'{"docs":["asdf","123"]}'},
      ssms = null,
      getUrl = '',
      mockError = null,
      mockResponse = null,
      mockBody = null;

  var MESSAGES_TO_SEND_ONCE = [
    {
          payload:{messages:[
              {uuid:0, message:'a', to:'0', random_key:'should be ignored'},
              {uuid:1, message:'b', to:'1'},
              {uuid:2, message:'c', to:'2'}]},
          callback:{data:{docs:['asdf', '123']}, 
          options:{protocol:'http', host:'localhost', port:5999, path:'/weird-callback'}}},
    {}
  ];

  beforeEach(function() {
    mockBody = '{"count": 1, "response_code": 200, "response": "1 mesages has been queued for delivery"}';
    mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false
    });
    var optimistMock = {
      argv: {
        sparrowSmsApiToken: "token_val",
        sparrowSmsFrom: "from_val",
        sparrowSmsReceivePort: 8765
      }
    };
    var webserverMock = {
      listenOnPath: function() {},
      stopListeningOnPath: function() {}  
    };
    var requestMock = function (params, callback) {
      getUrl = params.url;
      callback(mockError, mockResponse, mockBody);
    };
    mockery.registerMock('optimist', optimistMock);
    mockery.registerMock('../webserver', webserverMock);
    mockery.registerMock('request', requestMock);
    ssms = driver.create('sparrowsms');
  });

  afterEach(function() {
    mockery.disable();
    if(ssms) ssms.stop();
  });

  var error_and_done = function(done, error_message) {
    return function() { return done(new Error(error_message)); };
  };

  describe('send', function() {
    it('should call supplied callback if a good message is supplied', function(done) {
      mockResponse = {
        statusCode: 200
      };
      // when
      ssms.send(TEST_MESSAGE, function(error, response) {
        // then
        return done();
      });
    });
    it('should call GET', function(done) {
      mockResponse = {
        statusCode: 200
      };

      // when
      ssms.send(TEST_MESSAGE, function(error, response) {
        assert.equal(getUrl, 
          'http://api.sparrowsms.com/v2/sms?token=token_val&from=from_val&to=123456&text=Hello%20World');
        if(error) return done(error);
        assert.deepEqual(response, { status:'success' });
        return done();
      });
    });
    it('error when response status is 404', function(done) {
      mockResponse = {
        statusCode: 404
      };

      // when
      ssms.send(TEST_MESSAGE, function(error, response) {
        assert.deepEqual(response, { status:'failure' });
        return done();
      });
    });    
    it('error when response returns error', function(done) {
      mockResponse = {
        statusCode: 200
      };
      mockError = "I am an error";

      // when
      ssms.send(TEST_MESSAGE, function(error, response) {
        assert.deepEqual(response, { status:'failure' });
        return done();
      });
    });    
  });
});
