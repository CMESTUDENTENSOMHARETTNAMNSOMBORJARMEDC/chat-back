const db = require('../data/database')

const findAll = async () => {
  const result = await db('users').select()
  return result
}

const findOne = async (id) => {
  const result = await db('users').select().where({ id: id })
  return result[0]
}

const findOneByName = async (name) => {
  const result = await db('users').select().where({ name: name })
  return result[0]
}

const addOne = async (id, name) => {
  const result = await db('users').insert({name, id})
  return {id: result[0], name}
}

const removeOne = async (id) => {
  const result = await db('users').where({ id: id }).del()
  return result
}

module.exports = {
  findAll,
  addOne,
  findOne,
	removeOne,
	findOneByName
}


