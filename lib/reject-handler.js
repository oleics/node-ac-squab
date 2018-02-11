
module.exports = createRejectHandler;

function createRejectHandler(req, res, context) {
  return function(err){
    console.error(err.stack||err);
    res.statusCode = 500;
    // res.setHeader('Content-Type', 'text/html');
    res.end('ERROR! '+(err.stack||err));
  };
}
