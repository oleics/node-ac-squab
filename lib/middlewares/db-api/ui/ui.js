

module.exports = createDbApiUiMiddleware;

function createDbApiUiMiddleware(context) {
  var db = context.db;
  return middleware;
  function middleware(req, res, next) {
    res.render(__dirname+'/views/ui.twig', req.session);
  }
}
