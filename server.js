const fs = require('fs/promises')
const { v4: uuidv4 } = require('uuid')
const roomsModel = require('./models/rooms.model')
const messagesModel = require('./models/messages.model')
const usersModel = require('./models/users.model')

const messagelog = 'messagelog.json'
const pmlog = 'pmlog.json'

const { Server } = require('socket.io')

const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

const getUserName = (id) => {
  try {
    return io.sockets.sockets.get(id).username
  } catch {
    return null
  }
}

const getUserId = (id) => {
  try {
    return io.sockets.sockets.get(id).userId
  } catch {
    return null
  }
}

const getSessionId = (id) => {
  io.sockets.sockets.forEach((s) => {
    if (s.userId === id) {
      return s.id
    }
  })
}

io.use(async (socket, next) => {
  const username = socket.handshake.auth.username
  try {
    io.sockets.sockets.forEach((s) => {
      console.log('this ' + s.username)
      console.log('vs ' + username)
      if (s.username == username) {
        return next(new Error('name already exists'))
      }
    })
  } catch (error) {
    console.log(error)
    return
  }

  if (!username) {
    return
  }

  const user = await usersModel.findOneByName(username)
  const userId = user ? user.id : uuidv4()
  if (!user) {
    console.log('adding user')
    usersModel.addOne(userId, username)
  }

  // socket.sessionID = uiidv4();
  socket.userId = userId
  socket.username = username
  socket.broadcast.emit('user connected', {
    user: { sid: socket.id, id: socket.userId, name: socket.username },
  })
  next()
})

io.use((socket, next) => {
  // Not really in the middle. Couldn't come up with a better solution
  socket.on('message', async ({ message, recipient }) => {
    const log = {
      session: socket.id,
      from: socket.userId,
      to: recipient,
      message,
      time: Date(),
    }
    try {
      const out = await fs.writeFile(messagelog, JSON.stringify(log), {
        flag: 'a',
      })
    } catch (err) {
      console.log(err)
    }
  })

  socket.on('private message', async ({ message, recipient }) => {
    const log = {
      from: socket.userId,
      to: recipient,
      message,
      time: Date(),
    }
    try {
      const out = await fs.writeFile(pmlog, JSON.stringify(log), { flag: 'a' })
    } catch (err) {
      console.log(err)
    }
  })

  next()
})

io.on('connection', (socket) => {
  console.log(`anslutit med ${socket.userId}`)

  socket.on('ready', async () => {
    socket.emit('change name', socket.username)
    socket.emit('init', { users: [], rooms: await roomsModel.findAll() })
  })

  socket.on('fetch rooms', async () => {
    socket.emit('all rooms', { rooms: await roomsModel.findAll() })
  })

  socket.on('fetch room', async (id) => {
    socket.emit('messages room', await roomsModel.findMessages(id))
  })

  socket.on('fetch private room', async ({ from, recipient }) => {
    const messages = await messagesModel.findPrivateMessages(
      socket.userId,
      recipient
    )
    socket.emit('messages room', messages)
  })

  socket.on('fetch users', (id) => {
    const users = Array.from(io.of('/').adapter.rooms.get(id)).map((sid) => {
      return {
        sid: sid,
        id: getUserId(sid),
        name: getUserName(sid),
      }
    })
    socket.emit('users room', { room: id, users })
  })

  socket.on('fetch private users', ({ other }) => {
    const users = []
    console.log('other is ' + other)
    let sid = null
    let username = null
    io.sockets.sockets.forEach((s) => {
      if (s.userId === other) {
        sid = s.id
        username = s.username
      }
    })
    if (sid && username) {
      users.push({
        sid: sid,
        id: other,
        name: username,
      })
    } else {
      console.log('user offline')
    }
    users.push({ sid: socket.id, id: socket.userId, name: socket.username })
    socket.emit('users private room', { room: other, users })
  })

  socket.on('message', (data) => {
    const emptyMsg = data.message === ''
    if (!emptyMsg) {
      const message = {
        id: uuidv4(),
        username: socket.username || 'none',
        user_id: socket.userId,
        message: data.message,
        recipient: data.recipient,
        created_at: Date(),
      }
      messagesModel.addOne(message)
      socket.to(data.recipient).emit('message', message)
      socket.emit('message', message)
    }
  })

  socket.on('private message', (data) => {
    const emptyMsg = data.message === ''
    if (!emptyMsg) {
      const message = {
        id: uuidv4(),
        username: socket.username || 'none',
        user_id: socket.userId,
        message: data.message,
        recipient: data.recipient,
        created_at: Date(),
      }
      messagesModel.addOne(message, true)
      let sid = null
      io.sockets.sockets.forEach((s) => {
        if (s.userId === data.recipient) {
          sid = s.id
        }
      })
      if (sid) {
        socket.to(sid).emit('private message', { ...message, sid: socket.id })
      }
      socket.emit('message', message)
    }
  })

  socket.on('create room', async (data) => {
    console.log('creating room ' + data.name)
    if (data.name !== '') {
      const newRoom = await roomsModel.addOne({ id: uuidv4(), ...data })
      if (newRoom) {
        socket.emit('new room', newRoom)
        socket.broadcast.emit('new room', newRoom)
      }
    }
  })

  socket.on('delete room', async ({ id, password }) => {
    const roomToDelete = await roomsModel.findOne(id, password)
    if (!roomToDelete.length) {
      console.log('wrong pass')
      socket.emit('wrong password', id)
    } else {
      console.log(`deleting room ${id}`)
      const newRoom = await roomsModel.removeOne(id)
      socket.emit('delete room', id)
      socket.broadcast.emit('delete room', id)
    }
  })

  socket.on('update room', (data) => {
    rooms.find(data.id).update(data.update)
  })

  socket.on('view room', (data) => {
    const foundRoom = rooms.find(data.id)
    socket.broadcast.emit('room details', foundRoom)
  })

  socket.on('join room', async ({ id, password }) => {
    const roomToJoin = await roomsModel.findOne(id, password)
    if (!roomToJoin.length) {
      socket.emit('wrong password', id)
    } else {
      console.log(`${socket.username} har gått med i ${id}`)
      socket.join(id)
      socket.to(id).emit('other joined room', {
        user: { id: socket.userId, sid: socket.id, name: socket.username },
        room: id,
      })
      socket.emit('joined room', id)
    }
  })

  socket.on('leave room', (id) => {
    console.log(`${socket.username} har lämnat ${id}`)
    socket.leave(id)
    socket.to(id).emit('other left room', { id: socket.id, room: id })
    socket.emit('left room', id)
  })

  // socket.on('change name', (name) => {
  //   // console.log(`${socket.id} byter namn till  ${name}`)
  //   if (name === '') {
  //     name = 'macke'
  //   }
  //   socket.emit('change name', name)
  //   socket.username = name
  // })

  socket.on('is writing', (room) => {
    socket.broadcast.to(room).emit('is writing', { room, id: socket.id })
  })

  socket.on('disconnect', (reason) => {
    for (const room of io.of('/').adapter.rooms.keys()) {
      socket.to(room).emit('other left room', { id: socket.id, room })
      socket.broadcast.emit('user disconnected', {
        sid: socket.id,
        id: socket.userId,
      })
    }
    console.log(`socket ${socket.userId} disconnected. Reason: ${reason}`)
  })
})

io.listen(process.env.PORT || 4000)
