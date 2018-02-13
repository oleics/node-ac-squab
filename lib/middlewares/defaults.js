
module.exports = createDefaultsMiddleware;

function createDefaultsMiddleware(context) {
  return middleware;
  function middleware(req, res, next) {
    res.locals.app = req.app;
    res.locals.req = req;
    next();
  }
}
