const knexConfig = require("./knexfile");
const knex = require("knex");

// const db = require("knex")(knexConfig[process.env.NODE_ENV]);
const db = knex(knexConfig[process.env.NODE_ENV || 'development']);

module.exports = db;
