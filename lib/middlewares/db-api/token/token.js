
var SESSION_SECRET = 'shhhh, very secret';
var ADMIN_ROLE = 'admin';

var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');

module.exports = createDbApiTokenMiddleware;

function createDbApiTokenMiddleware(context) {
  var db = context.db;
  var router = express.Router();

  router.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: SESSION_SECRET,
  }));

  router.get('/_login', function(req, res, next){
    var token = req.query.token || req.params.token || req.session.token;
    if(!token) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf8');
      res.end(JSON.stringify({}));
      return;
    }
    db.token.verifyAndDecode(token).then(function(data){
      req.session.token = token;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf8');
      res.end(JSON.stringify(data||{}));
    });
  });

  router.get('/_token_lucyintheskywithdiamonds', function(req, res, next){
    var token = req.query.token || req.params.token || req.session.token;
    if(!token) {
      return res.redirect('/_token/'+context.dbtoken);
    }
    res.redirect('/_token');
  });

  router.get('/_token/:token?', function(req, res, next){
    var newToken = req.query.newToken || req.params.newToken;
    var token = req.query.token || req.params.token || req.session.token;
    if(token) {
      return db.token.verifyAndDecode(token).then(function(data){
        if(!data) {
          req.session.token = null;
          return res.redirect('/_token');
        }
        req.session.token = token;
        if(newToken) {
          return db.token.verifyAndDecode(newToken).then(function(newData){
            if(!newData) {
              return res.redirect('/_token');
            }
            res.render(__dirname+'/views/create.twig', {
              token: token,
              data: data,
              newToken: newData ? newToken : null,
              newData: newData,
            });
          });
        }
        return res.render(__dirname+'/views/create.twig', {
          token: token,
          data: data,
          newToken: null,
          newData: null,
        });
      });
    }
    res.render(__dirname+'/views/create.twig', {
      token: null,
      data: null,
      newToken: null,
      newData: null,
    });
  });

  router.use(function middleware(req, res, next) {
    var token = req.query.token || req.session.token;
    if(token === null) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    req.hasRole = function(role){
      return hasRole(req.session.tokendata, ADMIN_ROLE);
    };
    req.token = function(){
      return req.session ? req.session.token : null;
    };
    req.tokenUser = function(){
      return req.session ? req.session.tokendata : null;
    };
    db.token.verifyAndDecode(token).then(function(data){
      if(!data) {
        req.session.token = null;
        req.session.tokendata = null;
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      req.session.token = token;
      req.session.tokendata = data;
      next();
    });
  });

  router.post('/_token/:token?', bodyParser.urlencoded({ extended: false }));
  router.post('/_token/:token?', function(req, res, next){
    if(!req.hasRole(ADMIN_ROLE)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf8');
      res.end(JSON.stringify({
        status: 'ERROR',
        reason: 'Forbidden',
      }));
      return;
    }
    db.token.generate(createUser(req.body, req.tokenUser()))
      .then(function(token){
        res.redirect('/_token?newToken='+token);
      })
    ;
  });


  return router;
}

function createUser(data, createdBy) {
  return {
    username: data.username,
    roles: data.roles ? data.roles : [],
    createdBy: createdBy ? createdBy.username : null,
  };
}

function hasRole(user, role) {
  if(user == null || user.roles == null || user.roles.indexOf == null || user.roles.indexOf(role) === -1) {
    return false;
  }
  return true;
}
