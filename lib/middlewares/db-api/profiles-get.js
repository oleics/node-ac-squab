
module.exports = createDbApiProfilesGetMiddleware;

function createDbApiProfilesGetMiddleware(context) {
  var db = context.db;
  return middleware;
  function middleware(req, res, next) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf8');
    res.end(JSON.stringify(db.getProfiles()));
  }
}
