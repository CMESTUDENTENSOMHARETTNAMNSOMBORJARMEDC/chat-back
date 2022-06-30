const db = require('../data/database')

const findAll = async () => {
  //find all in room:id
  const result = await db('messages').select()
  return result
}

//find all in room:id
const findOne = async (id) => {
  const result = await db('messages').select().where({ recipient: id })
  // console.log(result[0])
  return result[0]
}

const addOne = async (message, pm = false) => {
  let result
  try {
    pm
      ? (result = await db('pms').insert(message))
      : (result = await db('messages').insert(message))
  } catch (error) {
    console.log(error)
    return null
  }
  return result
}

const removeOne = async (id) => {
  const result = await db('messages').where({ id: id }).del()
  return result
}

const findPrivateMessages = async (from, recipient) => {
  const result = await db('pms')
    .where({ user_id: from, recipient: recipient })
    .orWhere({ user_id: recipient, recipient: from })
    .select('id', 'message', 'username', 'created_at')
  return result
}

module.exports = {
  findAll,
  addOne,
  findOne,
  removeOne,
  findPrivateMessages,
}
