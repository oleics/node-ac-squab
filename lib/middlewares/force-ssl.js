
module.exports = createForceSslMiddleware;

function createForceSslMiddleware(context) {
  if(context.disableForceSsl) {
    return function(req, res, next){
      next();
    };
  }
  return middleware;
  function middleware(req, res, next) {
    if(!req.secure) {
      var forwardedProto = req.get('X-Forwarded-Proto');
      if(forwardedProto && forwardedProto.toLowerCase() === 'https') {
        return next();
      }
      if(req.method === 'GET') {
        return res.redirect(301, 'https://' + req.headers.host + req.url)
      }
      return res.status(403).send('SSL Required.');
    }
    next();
  }
}
