const mysql = require('mysql');
let config = require('./config.js');

let pool = mysql.createPool(config);

module.exports = pool;

