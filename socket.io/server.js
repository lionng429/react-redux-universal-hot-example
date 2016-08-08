import _ from 'lodash';
import {
  DASHBOARD_MOUNTED,
  QUEUES_LOADED,
  JOIN_RESOURCE,
  LEAVE_RESOURCE,
  ERROR,
} from './events';

const DEFAULT_CHANNEL = 'lobby';

const getNativeQueues = new Promise((resolve, reject) => {
  // TODO: replace it with API request
  // mock the time taking request
  setTimeout(() => {
    resolve({
      new_reviews: {
        identifier: 'new_reviews',
        type: 'native',
        endPoint: 'reviews/approvalQueue',
        resourcesInProcess: [],
        resourcesToProcess: [],
        remainingItems: 80,
        processors: []
      },
      new_comments: {
        identifier: 'new_comments',
        type: 'native',
        endPoint: 'comments/approvalQueue',
        resourcesInProcess: [],
        resourcesToProcess: [],
        remainingItems: 24,
        processors: []
      },
      new_questions: {
        identifier: 'new_questions',
        type: 'native',
        endPoint: 'questions/approvalQueue',
        resourcesInProcess: [],
        resourcesToProcess: [],
        remainingItems: 15,
        processors: []
      },
      new_answers: {
        identifier: 'new_answers',
        type: 'native',
        endPoint: 'answers/approvalQueue',
        resourcesInProcess: [],
        resourcesToProcess: [],
        remainingItems: 104,
        processors: []
      }
    });
  }, 500);
});

export default io => {
  // TODO: fetch and store the native queues
  // upon socket.io server initialisation

  // using machine memory here
  // replace it with redis or something similar for scalability?
  const clients = [];
  const queue = {};

  try {
    io.on('connection', socket => {
      console.info(`socket.io connection ID: ${socket.conn.id} established from ${socket.handshake.address}`);

      const socketId = socket.conn.id;

      // not sure yet if we should maintain a client list
      // it's available from io / socket object
      clients.push(socket);

      // join the default channel
      // in order to receive broadcast message
      // may not be necessary as io.emit can do
      socket.join(DEFAULT_CHANNEL);

      // on dashboard mounted,
      // user needs the queues data,
      // send the computed queues as payload
      socket.on(DASHBOARD_MOUNTED, (user = {}) => {
        console.info(`event '${DASHBOARD_MOUNTED}' received from `, socketId);

        getNativeQueues
          .then(queues => {
            console.info('queues obtained from API');

            socket
              .emit(QUEUES_LOADED, queues);
          })
          .catch(err => {
            // TODO: to define a better socket error model
            socket
              .emit(ERROR, {
                status: 500,
                message: err.message,
              });
          });
      });

      // requiring access to a resource
      socket.on(JOIN_RESOURCE, (data = {}) => {
        const { resourceId, user } = data;

        if (!user || !user.socketId) {
          return;
        }

        if (!resourceId) {
          socket
            .to(`/#${user.socketId}`)
            .emit(ERROR, { status: 400 });
          return;
        }

        const occupied = !_.isEmpty(queue[resourceId]);

        if (occupied) {
          // let the user know the resource is being occupied?
          return;
        }

        const currentQueue = queue[resourceId];

        // add user into a queue
        currentQueue.push(user);

        socket.join(resourceId);
        socket
          .broadcast
          .to(DEFAULT_CHANNEL)
          .emit(REFRESH_RESOURCE, currentQueue);
      });

      // releasing access to a resource
      socket.on(LEAVE_RESOURCE, (resourceId, user) => {
        // remove the user from memory queue
        const currentQueue = _.remove(queue[resourceId], _user => _user.id === user.id);

        socket.leave(resourceId);
        socket
          .broadcast
          .to(DEFAULT_CHANNEL)
          .emit(REFRESH_RESOURCE, currentQueue)
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