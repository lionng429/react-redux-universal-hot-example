import {
  ASK_FOR_RESOURCE,
  SET_LOCKER,
} from './events';

export default io => {
  const _clients = new Map();

  try {
    io.on('connection', socket => {
      const socketId = socket.conn.id;
      const ipAddr = socket.handshake.address;

      console.info(`socket.io connection ID: ${socketId} established from ${ipAddr}`);

      socket.on(ASK_FOR_RESOURCE, () => {});

      socket.on(SET_LOCKER, () => {});

      // when the user disconnected from the ws, e.g. closing browser
      socket.on('disconnect', () => {
        console.info(`socket ${socketId} disconnected.`);

        // const currentResource = _clients.get(socketId).get('resource');

        // if the disconnected user is the locker
        // 1. unlock the resource
        // 2. broadcast the new locker
      });
    });

    // Disconnection
    // Upon disconnection, sockets leave all the channels
    // they were part of automatically,
    // and no specially teardown is needed on your part.
    // http://socket.io/docs/rooms-and-namespaces/#disconnection
  } catch (err) {
    console.error('failed to initialise Socket.io connection on server');
  }
};