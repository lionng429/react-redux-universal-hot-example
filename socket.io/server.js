import _ from 'lodash';
import {
  DASHBOARD_MOUNTED,
  QUEUES_LOADED,
  JOIN_RESOURCE,
  LEAVE_RESOURCE,
  ERROR,
} from './events';

const DASHBOARD_CHANNEL = 'dashboard';
const UPDATE_TIME_INTERVAL = 5 * 1000;

// TODO: add unit test
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
  // fetch and store the native queues
  // upon socket.io server initialisation
  // the socket.io server will keep refreshing the queues
  // and broadcast to DASHBOARD_CHANNEL
  let _queues = {};

  function refreshQueues() {
    getNativeQueues
      .then(nativeQueues => {
        // get and merge _queues with nativeQueues
        return nativeQueues;
      })
      .then(computedQueues => {
        // update the _queues variable
        _queues = computedQueues;

        io
          .to(DASHBOARD_CHANNEL)
          .emit(QUEUES_LOADED, computedQueues);
      })
      .catch(err => {
        // TODO: to define a better socket error model
        io
          .to(DASHBOARD_CHANNEL)
          .emit(ERROR, {
            status: 500,
            message: err.message,
          });
      });
  }

  // what if error occurred with the API?
  // should set a maximum number of retry for setInterval
  const queuesRefresh = setInterval(refreshQueues, UPDATE_TIME_INTERVAL);

  // using machine memory here
  // replace it with redis or something similar for scalability?
  const clients = [];

  try {
    io.on('connection', socket => {
      console.info(`socket.io connection ID: ${socket.conn.id} established from ${socket.handshake.address}`);

      const socketId = socket.conn.id;

      // not sure yet if we should maintain a client list
      // it's available from io / socket object
      clients.push(socket);

      // on dashboard mounted,
      // user needs the queues data,
      // send the computed queues as payload
      socket.on(DASHBOARD_MOUNTED, (user = {}) => {
        console.info(`event '${DASHBOARD_MOUNTED}' received from `, socketId);

        // subscribe the user with the DASHBOARD_CHANNEL
        // so that the user will receive the updated queues broadcasting
        socket.join(DASHBOARD_CHANNEL);

        // send the most updated queues on hand
        // so the user does not have to wait for next broadcast
        socket.emit(QUEUES_LOADED, _queues);
      });

      // requiring access to a resource
      socket.on(JOIN_RESOURCE, (data = {}) => {
        console.info(`event '${JOIN_RESOURCE}' received from `, socketId);

        const { resourceId, user, timestamp } = data;

        if (!user) {
          console.error('user data is missing.');
          socket.emit(ERROR, { status: 401 });
          return;
        }

        if (!resourceId) {
          console.error('resourceId is missing.');
          socket.emit(ERROR, { status: 400 });
          return;
        }

        if (!timestamp) {
          console.error('timestamp is missing.');
          socket.emit(ERROR, { status: 400 });
          return;
        }

        const resource = _.find(_queues, ({ resourcesToProgress }) => {
          return _.find(resourcesToProgress, resource => resource === resourceId);
        });

        const occupied = _.find(_queues, ({ resourcesInProgress }) => {
          return _.find(resourcesInProgress, resource => resource === resourceId);
        });

        if (occupied) {
          // let the user know the resource is being occupied?
          return;
        }

        // mutates the _queues object
        // 1. push resourceInProgress
        // 2. push processors
        // 3. locker?
        // 4. watcher?

        // subscribe the user with the RESOURCE_ID_CHANNEL
        // so that the user will receive the related updates of resource
        socket.join(resourceId);

        // broadcast the real-time updates
        // or let the 5s interval update do it?
      });

      // releasing access to a resource
      socket.on(LEAVE_RESOURCE, (resourceId, user) => {
        // mutates the _queues object
        // 1. push resourceInProgress
        // 2. push processors
        // 3. locker?
        // 4. watcher?

        // unsubscribe the user with the RESOURCE_ID_CHANNEL
        socket.leave(resourceId);

        // broadcast the real-time updates
        // or let the 5s interval update do it?
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