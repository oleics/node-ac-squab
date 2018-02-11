
var inherits = require('inherits');
var SimpleModel = require('../simple-model');
var got = require('got');
var parseString = require('./parse-string');

module.exports = Client;

function Client(options) {
  if(!(this instanceof Client)) return new Client(options);
  SimpleModel.call(this, {
    numOfPendingOps: 0,
    numOfRows: 0,
  });

  if(options == null) options = {};

  this.endpoint = options.endpoint || 'http://localhost:3000';
}

inherits(Client, SimpleModel);

Client.prototype.addItem = function(item) {
  this.setProps({
    numOfPendingOps: this.getProps().numOfPendingOps + 1,
  });
  var data = JSON.stringify(item);
  return got(this.endpoint+'/', {
    method: 'POST',
    body: data,
    headers: {
      'Content-Type': 'application/json; charset=utf8',
    }
  })
    .then(function(res){
      this.setProps({
        numOfPendingOps: this.getProps().numOfPendingOps - 1,
      });
      var body = parseString(res.body);
      return body;
    }.bind(this))
  ;
};
