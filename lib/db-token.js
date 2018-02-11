
var TOKEN_SECRET = process.env.TOKEN_SECRET || 'shhhh, very secret';
var saltRounds = 10;

var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

module.exports = DbToken;

function DbToken(db, secret) {
  this.db = db;
  this._secret = secret || TOKEN_SECRET;
}

// DbToken.prototype.getTable = function() {
//   return this._table;
// };

DbToken.prototype.generate = function(data) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var options = {
      expiresIn: '14d', // seconds or zeit/ms@npm
      // notBefore: 60*60, // seconds or zeit/ms@npm
      // algorithm: 'HS256'
    };
    jwt.sign(data, self._secret, options, function(err, token){
      if(err) return reject(err);
      resolve(token);
      // return self.db.insertRows({
      //   token: token,
      //   created: Date.now(),
      // }, self.getTable())
      //   .then(function(){
      //     resolve(token);
      //   })
      //   .catch(reject)
      // ;
    });
  });
};

DbToken.prototype.decode = function(token) {
  return new Promise(function(resolve, reject) {
    var decoded = jwt.decode(token);
    resolve(decoded);
  });
};

DbToken.prototype.verifyAndDecode = function(token) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var options = {
      ignoreExpiration: false,
      // clockTimestamp: Math.round(Date.now()/60), // seconds
      // algorithms: ['HS256']
    };
    jwt.verify(token, self._secret, options, function(err, decoded) {
      if(err && err.name !== 'TokenExpiredError' && err.name !== 'JsonWebTokenError' && err.name !== 'NotBeforeError') {
        return reject(err);
      }
      if(err) {
        return resolve();
      }
      resolve(decoded);
    });
  });
};
