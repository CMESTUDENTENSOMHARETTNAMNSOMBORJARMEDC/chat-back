const db = require('../data/database')

const findAll = async () => {
  const result = await db('rooms').select()
  return result
}

const findOne = async (id, password) => {
  const result = await db('rooms')
    .select()
    .where({ id: id, password: password })
  return result
}

//wrong place
const findMessages = async (id) => {
  const result = await db('messages')
    .join('rooms', 'messages.recipient', '=', 'rooms.id')
    .select('messages.id', 'message', 'username', 'messages.created_at')
    .where('rooms.id', id)
  return result
}

const addOne = async ({ id, name, password }) => {
  try {
    const result = await db('rooms').insert({ id, name, password }, ['id', 'name'])
    return { id: result[0], name, password: password.length > 0 }
  } catch {
    console.log('something went wrong')
    return null
  }
}

const removeOne = async (id) => {
  const result = await db('rooms').where({ id: id }).del()
  return result
}

module.exports = {
  findAll,
  addOne,
  findMessages,
  findOne,
  removeOne,
}
