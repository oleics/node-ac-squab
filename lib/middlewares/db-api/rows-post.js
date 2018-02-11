
var qs = require('qs');
var createRejectHandler = require('../../reject-handler');

module.exports = createDbApiRowsPostMiddleware;

function createDbApiRowsPostMiddleware(context) {
  var db = context.db;

  return middleware;

  function middleware(req, res, next) {
    var onReject = createRejectHandler(req, res, context);

    var host = req.headers.host;
    var table = req.params.table;

    return parseStream(req)
      .then(function(data){
        if(data != null) {
          return db.insertOrUpdateRows(data, table)
            .then(function(numOfRows){
              return db.getRowsByIds(data, table)
                .then(function(rows){
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json; charset=utf8');
                  res.end(JSON.stringify({
                    rows: rows,
                  }));
                })
              ;
            })
            .catch(onReject)
          ;
        }
        res.statusCode = 400;
        res.end('Bad Request');
      })
      .catch(onReject)
    ;
  }
}
