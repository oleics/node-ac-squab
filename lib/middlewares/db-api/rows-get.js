
var qs = require('qs');
var createRejectHandler = require('../../reject-handler');

module.exports = createDbApiRowsGetMiddleware;

function createDbApiRowsGetMiddleware(context) {
  var db = context.db;

  return middleware;

  function middleware(req, res, next) {
    var onReject = createRejectHandler(req, res, context);

    var host = req.headers.host;
    var table = req.params.table;
    var query = isEmptyObject(req.query) ? false : req.query;

    return db.getRows(query||{}, table)
      .then(function(rows){
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf8');
        res.end(JSON.stringify({
          url: 'http://'+host+'/'+(table||'')+(query?'?'+qs.stringify(query):''),
          table: table,
          rowsTotal: rows.length,
          rows: rows.map(function(row){
            row._url = 'http://'+host+'/'+(table||'')+(query?'?'+qs.stringify(query):'');
            return row;
          }),
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
