/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('messages', (table) => {
    table.string('id').primary()
    table.string('user_id').notNullable()
    table.string('username').notNullable()
    table.string('recipient')
    table.string('message').notNullable()
    table.bigInteger('created_at').notNullable()
    table.foreign('recipient').references('rooms.id').onDelete('CASCADE')
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('messages')
}
