
module.exports = maintenanceMiddleware;

function maintenanceMiddleware(context) {
  return middleware;
  function middleware(req, res, next) {
    res.end('maintenance');
  }
}
