'use strict'

const loki = require('lokijs');

const WebSocket = require('ws');
const http = require('http');
const EventEmitter = require('events');
const async = require('async');

const zlib = require('zlib');


const fs = require('fs');

const request = require('request');

function ramdonID(){
  var chars = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM-_0123456789";

  var len = 16;

  var strLen = chars.length;

  var str = "";

  for (var i = 0; i < 16; i++){
    var r = random(0, strLen - 1);

    str += chars.charAt(r);

  }

  return str;

}

function random(min, max){
  return Math.random() * (max - min) + min;
}


function gzip(string){
  if (typeof string === 'object'){
    string = JSON.stringify(string);
  }
  var buffer = new Buffer(string);
  return zlib.gzipSync(buffer, {level : zlib.Z_BEST_COMPRESSION }).toString('base64');
}


function Delivery(options){
  var self = this;

  self.emitter = new EventEmitter();

  self.options = options;

  self._wsServer = options.ws;

  self._timeout = options.timeout || 1200;

  self._serverOK = false;

  self._isFlushing = false;

  self._bulkSize = options.bulkSize || 500;

  self._bulkAPI = options.bulkAPI || false;

  self._recordCache = {

  };

  self._keepAliveAgent = new http.Agent({ keepAlive: true });

  self._lokiJSOptions = {
    autoload: true,
    autosave: true,
    autosaveInterval: options.autosaveInterval || 10000,
    autoloadCallback : function (){
      self._queue = self._lokiDB.getCollection('queue');


      if (self._queue === null){
        self._queue = self._lokiDB.addCollection('queue');
      }

      console.log('Items in queue:', self._queue.data.length)
    }
  };

  self._lokiDB = new loki(options.db, self._lokiJSOptions);

  self._lokiDB.on('warning', function (a,b){
    console.log('LOKI warning', a,b)
  });


  self.emitter.on('connected', function (){
    console.log('Connection OK')

    self.flushQueue();
  });


  setTimeout(function (){
    self.connect();

  }, 100)

  return self;
};

Delivery.prototype.connect = function (){
  var self = this;
  self.ws = new WebSocket(self._wsServer);
  self.ws.on('open', function (data){
    console.log('Connected', data );
    self.flushQueue();
  })


  self.ws.on('message', function (data){
    var obj = JSON.parse(data);

    if (obj.type === 'delivery'){
      // Message was delivered, remove from local storage.
      var record = self._recordCache[obj.id];

      if (record) self.queueDeleteByID(record);
    }


  })

  self.ws.on('error', function (data){
    console.log('Conenction error')
    setTimeout(function (){

      self.connect();
    }, 1000)
  })
};


Delivery.prototype.send = function (message, callback){
  var self = this;


  var messageID = self.queueAppend(message);

  var cacheID = ramdonID();

  self._recordCache[cacheID] = messageID;

  var payload = JSON.stringify({ id : cacheID, message: message })


  self.ws.send(payload, function errorResponse(err){
    if (err) {
      self.connect();
      return console.log(err);
    }
  });

  /*if (self._serverOK){
    self.flushQueue();
  }*/

  /*request(options, function (err, res){

    if (res.statusCode >= 200 && res.statusCode <= 300){
      console.log('STATUS', res.statusCode)
      self.emitter.emit('success', err);

      if (self._serverOK === false){
        self.emitter.emit('connected', err);
      }

      self._serverOK = true;
      return callback(null, res);
    }

    self.emitter.emit('err', err);

    if (persist){
      // Adding to queue;
      self.queueAppend(options);
    }

    if (err) return callback(err);

    return callback('Connection OK, but server is not accepting data');

  });*/

}


Delivery.prototype.queueAppend = function (message){
  var self = this;

  var now = new Date().getTime();

  console.log('Appending to queue', message, self._queue.data.length);

  var queueMessage = {
    message : message
  };
  var record = self._queue.insert(queueMessage);

  return record['$loki'];

};


Delivery.prototype.setRecordOffline = function (recordID){

};
Delivery.prototype.bulkSend = function (array, callback){
  var self = this;

  var payload = gzip(array);

  var data = {
    gzip : true,
    payload : payload
  };

  request({
    method : 'POST',
    uri : self._bulkAPI
  }, function (err, res){
    console.log(err, res)
  })
}


Delivery.prototype.bulk = function (array){

  var self = this;

  var len = self._bulkSize;

  var parts = [];


  for (var i = 0; i < array.length; i += len){
    var x = array.splice(0,len);
    parts.push(x);

  }

  console.log(parts.length);


  async.forEachLimit(parts, 1, function (part, next){
    self.bulkSend(part, function (err, res){
      if (err) console.log(err);

      next(err);
    })
  }, function (err){
    if (err) return console.log('Could not send bulk');


  })
};


Delivery.prototype.queueDeleteByID = function (recordID){
  var self = this;

  return self._queue.remove(recordID);
};


Delivery.prototype.flushQueue = function (){
  var self = this;

  if (self._isFlushing) return console.log('Queue flush in progress');


  self._isFlushing = true;

  console.log('Flushing queue...');

  var offlineMessages = self._queue.find();
  var currency = self.options.concurrency || 4;

  console.log('Messages offline', offlineMessages.length);

  self.bulk(offlineMessages);
};



module.exports = Delivery;
