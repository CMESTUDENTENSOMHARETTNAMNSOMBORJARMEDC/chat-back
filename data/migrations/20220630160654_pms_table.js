/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('pms', (table) => {
    table.string('id').primary()
    table.string('user_id').notNullable()
    table.string('username').notNullable()
    table.string('recipient').notNullable()
    table.string('message').notNullable()
    table.bigInteger('created_at').notNullable()
    table.foreign('recipient').references('users.id').onDelete('CASCADE')
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('messages')
}

