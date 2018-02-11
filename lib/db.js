
var DbAuth = require('./db-auth');
var DbToken = require('./db-token');
var dbMixin = require('./db-mixin');
var pgformat = require('pg-format');

module.exports = getDbClient;

function getDbClient(options) {
  options = getDefaultOptions(options);
  var client = new DbClient(options);
  return client.connect();
}

function getDefaultOptions(options) {
  if(options == null) options = {};
  return options;
}

//

function DbClient(options) {
  if(!(this instanceof DbClient)) return new DbClient(options);

  this.connectionString = options.connectionString;
  this.sequelizeOptions = options.sequelizeOptions;

  this.tablePrefix = options.tablePrefix || 'sdb_';
  this.defaultTable = options.defaultTable || 'data';
  this.tables = {};

  this.idCandidates = [
    ['name', 'homepage'],
    ['id'],
  ];


  this.enableProfiler(process.env.NODE_ENV !== 'production');

  this.auth = new DbAuth(this);
  this.token = new DbToken(this);
}

dbMixin.call(DbClient.prototype);

// tables in databases

DbClient.prototype.initTables = function(tables) {
  var self = this;
  if(tables == null) tables = self.tables;
  return Promise.all(Object.keys(tables).map(function(table){
    return this.alterOrCreateTable(table, tables[table]);
  }, this))
    .then(function(){
      return self.tables;
    })
  ;
};

DbClient.prototype.getTables = function(force) {
  var self = this;
  if(this._getTablesPromise) {
    if(force) {
      if(this._getTablesForcePromise) {
        return this._getTablesForcePromise;
      }
      this._getTablesForcePromise = this._getTablesPromise.then(function(){
        self._getTablesPromise = null;
        return self.getTables();
      });
      return this._getTablesForcePromise;
    }
    return this._getTablesPromise;
  }
  this._getTablesForcePromise = null;
  this._getTablesPromise = new Promise(function(resolve, reject) {
    var tablePrefix = self.tablePrefix;
    if(force !== true && Object.keys(self.tables).length) {
      return Promise.resolve(self.tables);
    }
    var sql = self.format(
      'SELECT table_name AS table_name FROM information_schema.tables WHERE table_type = :table_type AND table_schema NOT IN (:table_schema) AND table_name LIKE :table_name'
    );
    return self._runSql(sql, {
      'table_type': 'BASE TABLE',
      'table_schema': ['pg_catalog', 'information_schema'],
      'table_name': tablePrefix+'%'
    })
      .then(function(res){
        return Promise.all(res.rows.map(function(row){
          return row.table_name;
        }).map(function(table){
          return table.slice(tablePrefix.length);
        }).map(function(table){
          return self.getColumns(table)
            .then(function(columns){
              return {
                table: table,
                columns: columns,
              };
            })
          ;
        }))
          .then(function(results){
            results.forEach(function(res){
              self.tables[res.table] = res.columns;
            });
            return self.tables;
          })
        ;
      })
      .then(resolve)
      .catch(reject)
    ;
  });
  return this._getTablesPromise;
};

DbClient.prototype.getColumns = function(table) {
  var sql = this.format('SELECT * FROM %I WHERE false', this.tablePrefix+table);
  return this._runSql(sql)
    .then(function(res){
      return res.fields.map(function(field){
        return field.name;
      });
    })
    .catch(function(err){
      if(err.code === '42703') {
        return Promise.resolve();
      }
      return Promise.reject(err);
    })
  ;
};

DbClient.prototype.createColumnDefinition = function(columnName) {
  return this.format('%I varchar default NULL', columnName);
};

DbClient.prototype.createTable = function(table, columns) {
  var self = this;
  var sql = this.format('CREATE TABLE %I (%s);', this.tablePrefix+table, columns.map(function(columnName){
    return this.createColumnDefinition(columnName);
  }, this).join(',\n'));
  return this._runSql(sql)
    .then(function(res){
      self.tables[table] = columns;
      return {
        table: table,
        columns: columns,
      };
    })
  ;
};

DbClient.prototype.alterTable = function(table, nextColumns) {
  var columns = this.tables[table];
  var newColumns = nextColumns.filter(function(columnName){
    return columns.indexOf(columnName) === -1;
  });
  if(newColumns.length === 0) {
    return Promise.resolve();
  }
  var self = this;
  var sql = this.format('ALTER TABLE %I\n%s;', this.tablePrefix+table, newColumns.map(function(columnName){
    return this.format('ADD COLUMN %s', this.createColumnDefinition(columnName));
  }, this).join(',\n'));
  return this._runSql(sql)
    .then(function(res){
      self.tables[table] = columns = columns.concat(newColumns);
      return {
        table: table,
        columns: columns,
      };
    })
  ;
};

DbClient.prototype.alterOrCreateTable = function(table, columns) {
  var self = this;
  return this.getTables()
    .then(function(tables){
      if(tables[table] == null) {
        return self.createTable(table, columns);
      }
      return self.alterTable(table, columns);
    })
  ;
};

// rows in tables

DbClient.prototype.getIdsInTable = function(table) {
  var data = {};
  this.tables[table].forEach(function(key){
    data[key] = '';
  });
  return Object.keys(this.getIdsInData(data));
};

DbClient.prototype.getIdsInData = function(data) {
  var res = false;
  this.idCandidates.some(function(idNames){
    res = {};
    if(idNames.some(function(key){
      res[key] = data[key];
      return data[key] == null;
    })) {
      res = false;
      return false;
    }
    return true;
  });
  return res;
};

DbClient.prototype.getTableInData = function(data) {
  if(data.type != null) {
    return data.type;
  }
  return this.defaultTable;
};

// rows in tables: read

DbClient.prototype._createWhereColumns = function(table, data) {
  var keys = Object.keys(data).filter(function(key){
    return this.tables[table].indexOf(key) !== -1;
  }, this);
  if(keys.length) {
    return keys.map(function(key){
      if(data[key] == null) {
        return this.format('%I IS NULL', column);
      }
      return this.format('%I = %L', key, data[key]);
    }, this).join(' AND ');
  }
  return 'true';
};

DbClient.prototype.numRows = function(data, /* optional */ table) {
  table = table || this.getTableInData(data);
  if(this.tables[table] == null) {
    return Promise.resolve(0);
  }
  var sqlWhereColumns = this._createWhereColumns(table, data);
  if(!sqlWhereColumns) {
    return Promise.resolve(0);
  }
  var sql = this.format('SELECT COUNT(*) AS numall FROM %I WHERE %s;', this.tablePrefix+table, sqlWhereColumns);
  return this._runSql(sql)
    .then(function(res){
      return parseInt(res.rows[0].numall, 10);
    })
  ;
};

DbClient.prototype.getRows = function(data, /* optional */ table) {
  table = table || this.getTableInData(data);
  if(this.tables[table] == null) {
    return Promise.resolve([]);
  }
  var sql;
  var sqlWhereColumns = this._createWhereColumns(table, data);
  if(sqlWhereColumns) {
    sql = this.format('SELECT * FROM %I WHERE %s;', this.tablePrefix+table, sqlWhereColumns);
  } else {
    sql = this.format('SELECT * FROM %I;', this.tablePrefix+table);
  }
  return this._runSql(sql)
    .then(function(res){
      return res.rows;
    })
  ;
};

// rows in tables: modify

DbClient.prototype._createWhereIds = function(table, data) {
  var ids = this.getIdsInData(data);
  var keys = Object.keys(ids);
  if(keys.some(function(key){
    return this.tables[table].indexOf(key) === -1;
  }, this)) {
    return false;
  }
  if(keys.length) {
    return keys.map(function(key){
      if(ids[key] == null) {
        return this.format('%I IS NULL', column);
      }
      return this.format('%I = %L', key, ids[key]);
    }, this).join(' AND ');
  }
  return 'true';
};

DbClient.prototype.numRowsByIds = function(data, /* optional */ table) {
  table = table || this.getTableInData(data);
  if(this.tables[table] == null) {
    return Promise.resolve(0);
  }
  var sqlWhereIds = this._createWhereIds(table, data);
  if(!sqlWhereIds) {
    return Promise.resolve(0);
  }
  var sql = this.format('SELECT COUNT(*) AS numall FROM %I WHERE %s;', this.tablePrefix+table, sqlWhereIds);
  return this._runSql(sql)
    .then(function(res){
      return parseInt(res.rows[0].numall, 10);
    })
  ;
};

DbClient.prototype.getRowsByIds = function(data, /* optional */ table) {
  table = table || this.getTableInData(data);
  if(this.tables[table] == null) {
    return Promise.resolve([]);
  }
  var sqlWhereIds = this._createWhereIds(table, data);
  if(!sqlWhereIds) {
    return Promise.resolve([]);
  }
  var sql = this.format('SELECT * FROM %I WHERE %s;', this.tablePrefix+table, sqlWhereIds);
  return this._runSql(sql)
    .then(function(res){
      return res.rows;
    })
  ;
};

DbClient.prototype.insertRows = function(data, /* optional */ table) {
  var self = this;
  table = table || this.getTableInData(data);
  var columns = Object.keys(data);
  return this.alterOrCreateTable(table, columns)
    .then(function(){
      var sql = self.format(
        'INSERT INTO %I (%s) VALUES (%s);',
        self.tablePrefix+table,
        columns.map(function(column){ return this.format('%I', column); }, self).join(', '),
        columns.map(function(column){ return this.format('%L', data[column] == null ? null : data[column]); }, self).join(', ')
      );
      return self._runSql(sql)
        .then(function(res){
          return res.rowCount;
        })
      ;
    })
  ;
};

DbClient.prototype.updateRows = function(data, /* optional */ table) {
  var self = this;
  table = table || this.getTableInData(data);
  return this.alterOrCreateTable(table, Object.keys(data))
    .then(function(){
      var sqlUpdate = Object.keys(data).map(function(column){
        return self.format('%I = %L', column, data[column] == null ? null : data[column]);
      }).join(', ');
      var sqlWhereIds = this._createWhereIds(table, data);
      var sql = self.format('UPDATE %I SET %s WHERE %s;', self.tablePrefix+table, sqlUpdate, sqlWhereIds);
      return self._runSql(sql)
        .then(function(res){
          return res.rowCount;
        })
      ;
    })
  ;
};

DbClient.prototype.deleteRows = function(data, /* optional */ table) {
  var self = this;
  table = table || this.getTableInData(data);
  return this.alterOrCreateTable(table, Object.keys(data))
    .then(function(){
      var sqlWhereIds = this._createWhereIds(table, data);
      var sql = this.format('DELETE FROM %I WHERE %s;', self.tablePrefix+table, sqlWhereIds);
      return self._runSql(sql)
        .then(function(res){
          return res.rowCount;
        })
      ;
    })
  ;
};

DbClient.prototype.insertOrUpdateRows = function(data, /* optional */ table) {
  var self = this;
  return this.numRowsByIds(data, table)
    .then(function(numRowsByIds){
      if(numRowsByIds) {
        return self.updateRows(data, table);
      }
      return self.insertRows(data, table);
    })
  ;
};

//

DbClient.prototype._runSql = function(sql, params) {
  if(this._enableProfiler) {
    return this._runSqlProfiler(sql, params);
  }
  return this._queryClient(sql, params);
};

//

DbClient.prototype.enableProfiler = function(enable) {
  this._enableProfiler = enable;
};

DbClient.prototype.getProfiles = function() {
  return this._profiles;
};

DbClient.prototype._runSqlProfiler = function(sql, params) {
  if(sql.slice(0, 6) !== 'SELECT') {
    return this._queryClient(sql, params);
  }
  var self = this;
  if(this._profiles == null) {
    this._profiles = [];
  }
  return this._queryClient('EXPLAIN ANALYZE '+sql, params)
    .then(function(res){
      while(self._profiles.length > 100) {
        self._profiles.shift();
      }
      self._profiles.push({
        sql: sql,
        params: params,
        profile: res.rows.map(function(row){
          return row['QUERY PLAN'];
        }),
      });
      // console.log(self._profiles[self._profiles.length-1]);
      return self._queryClient(sql, params);
    })
    .catch(function(err){
      console.error(err.stack||err);
      console.info(sql);
      process.exit(1);
    })
  ;
};
