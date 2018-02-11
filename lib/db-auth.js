
var USERS_TABLE = '_auth_users';
var saltRounds = 10;

var bcrypt = require('bcrypt');

module.exports = DbAuth;

function DbAuth(db, table) {
  this.db = db;
  this._table = table || USERS_TABLE;
}

DbAuth.prototype.getTable = function() {
  return this._table;
};

DbAuth.prototype.register = function(data) {
  var self = this;
  var username = data.username;
  var password = data.password;
  return self.db.getRows({
    username: username,
  }, self.getTable())
    .then(function(users){
      if(users.length) {
        return null;
      }
      return bcrypt.hash(password, saltRounds).then(function(hash){
        return self.db.insertRows({
          username: username,
          password: hash,
        }, self.getTable())
          .then(function(){
            return self.db.getRows({
              username: username,
            }, self.getTable())
              .then(function(user){
                return user[0];
              })
            ;
          })
        ;
      });
    })
  ;
};

DbAuth.prototype.login = function(data) {
  var username = data.username;
  var password = data.password;
  return this.db.getRows({
    username: username,
  }, this.getTable())
    .then(function(user){
      if(user.length !== 1) {
        return null;
      }
      user = user[0];
      return bcrypt.compare(password, user.password).then(function(equals){
        if(equals === true) {
          return user;
        }
        return null;
      });
    })
  ;
};

DbAuth.prototype.check = function(data) {
  var username = data.username;
  var password = data.password;
  return this.db.getRows({
    username: username,
  }, this.getTable())
    .then(function(user){
      if(user.length !== 1) {
        return null;
      }
      user = user[0];
      if(user.password === password){
        return user;
      }
      return null;
    })
  ;
};

DbAuth.prototype.can = function() {
  return true;
};
