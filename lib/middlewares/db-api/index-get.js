
var qs = require('qs');
var createRejectHandler = require('../../reject-handler');

module.exports = createDbApiGetProfilesMiddleware;

function createDbApiGetProfilesMiddleware(context) {
  var db = context.db;

  return middleware;

  function middleware(req, res, next) {
    var onReject = createRejectHandler(req, res, context);

    var host = req.headers.host;
    var query = isEmptyObject(req.query) ? false : req.query;

    return db.getTables()
      .then(function(tables){
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf8');
        res.end(JSON.stringify({
          tables: tables,
          urls: (function(){
            var tableUrls = [];
            var columnUrls = [];
            Object.keys(tables).forEach(function(table){
              tableUrls.push({
                table: table,
                url: 'http://'+host+'/'+table+(query?'?'+qs.stringify(query):''),
                columns: tables[table].map(function(column){
                  var item = {
                    column: column,
                    url: 'http://'+host+'/'+table+'/'+column+(query?'?'+qs.stringify(query):''),
                  };
                  columnUrls.push(item);
                  return item;
                })
              });
            });
            return {
              token: 'http://'+host+'/_token'+(query?'?'+qs.stringify(query):''),
              profiles: 'http://'+host+req.app.locals.path('profiles')+(query?'?'+qs.stringify(query):''),
              ui: 'http://'+host+req.app.locals.path('ui')+(query?'?'+qs.stringify(query):''),
              tables: tableUrls,
              columns: columnUrls,
            };
          })(),
        }));
      })
      .catch(onReject)
    ;
  }
}

function isEmptyObject(obj) {
  for(var prop in obj) if(obj.hasOwnProperty(prop)) return false;
  return JSON.stringify(obj) === JSON.stringify({});
}
