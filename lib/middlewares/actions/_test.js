
module.exports = _testAction;

function _testAction() {
  return function(req, res, qpath, query, context){
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(testForm());
  };
}

function testForm(data) {
  return ''+
    '<pre>'+JSON.stringify(data, null, '  ')+'</pre>'+
    '<form method="POST">'+
    '<div>ID: <input name="id"></div>'+
    '<div><textarea name="data" style="width:100%;height:150px"></textarea></div>'+
    '<div><button>Ok</button></div>'+
    '</form>'+
    '<form method="POST">'+
    '<div><textarea name="data" style="width:100%;height:150px"></textarea></div>'+
    '<div><button>Ok</button></div>'+
    '</form>'+
    '<form method="DELETE">'+
    '<div><textarea name="data" style="width:100%;height:150px"></textarea></div>'+
    '<div><button>DELETE</button></div>'+
    '</form>'+
    ''
  ;
}
