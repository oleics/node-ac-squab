
module.exports = routes;

function routes() {
  var routes = [

    // security
    {
      middleware: './lib/middlewares/defaults.js',
    },
    {
      middleware: './lib/middlewares/force-ssl.js',
    },
    {
      path: '/maintenance',
      middleware: './lib/middlewares/maintenance.js',
    },
    {
      middleware: './lib/middlewares/db-api/token/token.js',
    },

    // tools
    {
      name: 'ui',
      path: '/_ui',
      middleware: './lib/middlewares/db-api/ui/ui.js',
    },
    {
      name: 'profiles',
      path: '/_profiles',
      method: 'get',
      middleware: './lib/middlewares/db-api/profiles-get.js',
    },

    // api
    {
      path: '/',
      method: 'get',
      middleware: './lib/middlewares/db-api/index-get.js',
    },
    {
      path: '/:table?',
      method: 'get',
      middleware: './lib/middlewares/db-api/rows-get.js',
    },
    {
      path: '/:table?',
      method: 'post',
      middleware: './lib/middlewares/db-api/rows-post.js',
    },

  ];

  return Promise.resolve(routes);
}
