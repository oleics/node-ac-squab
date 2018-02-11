
var qs = require('qs');

module.exports = parseString;

function parseString(buffer) {
  if(!buffer.length) {
    return;
  }

  try {
    buffer = JSON.parse(buffer);
  } catch(ex) {
    try {
      buffer = qs.parse(buffer.toString());
    } catch(ex) {
      buffer = buffer.toString();
    }
  }

  return buffer;

}
