
var Client = require('./client');

module.exports = boot;

function boot(context) {
  return new Promise(function(resolve, reject) {
    var storeClient = context.storeClient = context.storeClient || new Client();
    resolve(context);
  });
}
