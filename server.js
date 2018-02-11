
var config = {
  PORT: process.env.PORT || 3000,
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://'+process.env.USER+':'+process.env.USER+'@localhost:5432/'+process.env.USER+'',
    sequelizeOptions: {
      logging: false,
      benchmark: false,
    },
  },
  dbInitTables: {
    '_routing': ['route', 'middleware'],
    'foo': ['bar', 'baz'],
    'bar': ['foo', 'baz'],
    'baz': ['foo', 'bar'],
    // 'hello': ['key', 'value'],
  },
};

var http = require('http');
var express = require('express');
var createDbInstance = require('./lib/db');

start()
  .then(function(context) {
    var address = context.server.address();
    console.log('OK up-and-running, port %s', address.port);
    console.log('DB ADMIN TOKEN:');
    console.log('%s', context.dbtoken);
  })
  .catch(function(err){
    console.error(err.stack||err);
    process.exit(1);
  })
;

function start() {
  return connectToDb(deref(config))
    .then(setupDb)
    .then(createDbAdminToken)
    .then(setupApp)
    .then(setupAppMiddlewares)
    .then(setupAndStartServer)
    .then(bindAppToServer)
  ;
}

function deref(value) {
  return JSON.parse(JSON.stringify(value));
}

function connectToDb(context) {
  return createDbInstance(context.db).then(function(db){
    context.db = db;
    return context;
  });
}

function setupDb(context) {
  return context.db.initTables(context.dbInitTables)
    .then(function(tables){
      // console.log('available tables:', tables);
      return context;
    })
  ;
}

function createDbAdminToken(context) {
  return context.db.token.generate({
    username: 'admin',
    roles: [
      'admin'
    ]
  })
    .then(function(token){
      context.dbtoken = token;
      return context;
    })
  ;
}

function setupApp(context) {
  var app = express();
  app.set('view engine', 'twig');
  context.app = app;
  return Promise.resolve(context);
}

function setupAppMiddlewares(context) {
  var app = context.app;
  var routes = require('./routes')();

  return require('./routes')().then(applyRoutes);

  function applyRoutes(routes) {

    app.locals.path = function(name, params){
      var route;
      routes.some(function(_route){
        if(_route.name == name) {
          route = _route;
          return true;
        }
      });
      if(!route) {
        throw new Error('Named route "'+name+'" not found.');
      }
      return route.path;
    };

    return Promise.all(routes.map(resolveMiddleware(context)))
      .then(function(results){
        results.forEach(function(data){
          if(data.method) {
            if(data.path) {
              app[data.method](data.path, data.middleware);
            } else {
              app[data.method](data.middleware);
            }
          } else {
            if(data.path) {
              app.use(data.path, data.middleware);
            } else {
              app.use(data.middleware);
            }
          }
        });
        return Promise.resolve(context);
      })
    ;
  }

  function resolveMiddleware(context) {
    return resolver;
    function resolver(data) {
      return new Promise(function(resolve, reject) {
        if(typeof data === 'string' || data instanceof String) {
          data = {
            middleware: require(data),
          };
          return resolver(data).then(resolve).catch(reject);
        }
        if(typeof data.middleware === 'string' || data.middleware instanceof String) {
          data.middleware = require(data.middleware);
          return resolver(data).then(resolve).catch(reject);
        }
        if(data.middleware instanceof Promise) {
          return data.middleware.then(function(middleware){
            data.middleware = middleware;
            return resolver(data).then(resolve).catch(reject);
          });
        }
        if(data.middleware.length === 1) {
          data.middleware = data.middleware(context);
          return resolver(data).then(resolve).catch(reject);
        }
        return resolve(data);
      });
    }
  }
}

function setupAndStartServer(context) {
  return new Promise(function(resolve, reject) {
    var server = http.createServer();

    server.once('listening', onceListening);
    server.once('error', onceError);

    server.listen(context.PORT);

    function onceListening() {
      server.removeListener('error', onceError);
      context.server = server;
      resolve(context);
    }

    function onceError(err) {
      server.removeListener('listening', onceListening);
      reject(err);
    }
  });
}

function bindAppToServer(context) {
  var app = context.app;
  var server = context.server;
  server.on('request', app);
  return Promise.resolve(context);
}
