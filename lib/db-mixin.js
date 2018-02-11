
var USE_SEQUELIZE = true;

var Sequelize = require('sequelize');

var PgClient = require('pg').Client;
var pgformat = require('pg-format');

//

module.exports = dbMixin;

function dbMixin() {
  this.format = pgformat;
  if(USE_SEQUELIZE) {
    dbSequelizeMixin.call(this);
  } else {
    dbPostgresMixin.call(this);
  }
}

//// Sequelize

function dbSequelizeMixin() {
  var dialect;

  // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators-security
  // https://github.com/sequelize/sequelize/issues/8417#issuecomment-341617577
  var operatorsAliases = false;
  // var operatorsAliases = Sequelize.Op;

  this.connect = function() {
    return new Promise(function(resolve, reject) {
      var options = {
        operatorsAliases: operatorsAliases,
      };
      Object.keys(this.sequelizeOptions||{}).forEach(function(key){
        options[key] = this.sequelizeOptions[key];
      }, this);

      var client = new Sequelize(this.connectionString, options);

      client.authenticate().then(function(){
        this.client = client;
        dialect = this.dialect = this.client.getDialect();
        this.initTables().then(function(){
          resolve(this);
        }.bind(this)).catch(reject);
      }.bind(this)).catch(reject);
    }.bind(this));
  };

  this._queryClient = function(sql, params) {
    var type = Sequelize.QueryTypes.RAW;
    // var type = sql.split(' ', 2)[0];
    // var typeMap = {
    //   EXPLAIN: Sequelize.QueryTypes.SELECT,
    // };
    // if(Sequelize.QueryTypes[type] != null) {
    //   type = Sequelize.QueryTypes[type];
    // } else if(typeMap[type] != null) {
    //   type = typeMap[type];
    // } else {
    //   type = Sequelize.QueryTypes.RAW;
    // }
    return this.client.query(sql, {
      type: type,
      raw: true,
      replacements: params,
    })
      .then(function(results){
        return transformFromDialect(dialect, results, sql, params);
      })
      .then(function(results){
        return results;
      })
    ;
  };

  /**
   * Transforms to a format like this:
     {
       rows: [{}, {}, ...],
       rowCount: 2,
       fields: [{
         name: '',
         format: ''
       }, ...]
     }
   */
  function transformFromDialect(dialect, results, sql, params) {
    // console.log('transformFromDialect %s (before) ', dialect, results, sql, params);
    var rows = results[0];
    var meta = results[1];

    // postgres | default
    if(dialect === 'postgres' || true) {
      results = {
        rows: rows,
        rowCount: meta.rowCount || rows.length,
        fields: [],
      };
      if(meta.fields) {
        results.fields = meta.fields.map(function(field){
          return {
            name: field.name,
            format: field.format,
          };
        });
      }
    }

    // console.log('transformFromDialect %s (after) ', dialect, results, sql, params);
    return results;
  }
}

//// Postgres

function dbPostgresMixin() {
  this.connect = function() {
    return new Promise(function(resolve, reject) {
      var client = new PgClient({
        connectionString: this.connectionString,
      });
      client.connect().then(function(){
        this.client = client;
        this.initTables().then(function(){
          resolve(this);
        }.bind(this)).catch(reject);
      }.bind(this)).catch(reject);
    }.bind(this));
  };

  this._queryClient = function(sql, params) {
    return this.client.query(sql, params);
  };
}
