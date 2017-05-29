

var Delivery = require('./lib/delivery.js')


var delivery = new Delivery({
  autosaveInterval : 5000,
  db : './sar-tracker.db',
  ws : 'ws://localhost:8888',
  bulkAPI : 'http://localhost:8888/bulk'
})




setInterval(function (){
  delivery.send({
      foo : 'bar',
      baz : 'buck'

  }, function (err, res){

    if (err) return console.log(err);

    if (!err) console.log('OK message should be sent..')
  })
}, 1500)
