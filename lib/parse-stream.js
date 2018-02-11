
var parseString = require('./parse-string');

module.exports = parseStream;

function parseStream(stream) {
  return new Promise(function(resolve, reject) {
    var buffer = new Buffer('');

    stream.on('data', onData);
    stream.once('error', onceError);
    stream.once('end', onceEnd);

    function onData(data){
      buffer = Buffer.concat([buffer, data], buffer.length + data.length);
    }

    function onceError(err) {
      stream.removeListener('data', onData);
      stream.removeListener('end', onceEnd);
      reject(err);
      buffer = null;
    }

    function onceEnd() {
      stream.removeListener('data', onData);
      stream.removeListener('error', onceError);

      buffer = parseString(buffer);

      if(buffer) {
        resolve(buffer);
      } else {
        resolve();
      }

      buffer = null;
    }
  });
}
