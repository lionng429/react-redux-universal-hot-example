import _ from 'lodash';
import {
  JOIN_DASHBOARD,
  LEAVE_DASHBOARD,
  JOIN_QUEUE,
  LEAVE_QUEUE,
  JOIN_RESOURCE,
  LEAVE_RESOURCE,
  QUEUES_LOADED,
  UPDATE_RESOURCE,
  ERROR,
} from './events';

const DASHBOARD_CHANNEL = 'dashboard';
const UPDATE_TIME_INTERVAL = 5 * 1000;

const nativeQueues = {
  new_reviews: {
    identifier: 'new_reviews',
    type: 'native',
    endPoint: 'reviews/approvalQueue',
    processors: [],
  },
  new_comments: {
    identifier: 'new_comments',
    type: 'native',
    endPoint: 'comments/approvalQueue',
    processors: [],
  },
  new_questions: {
    identifier: 'new_questions',
    type: 'native',
    endPoint: 'questions/approvalQueue',
    processors: [],
  },
  new_answers: {
    identifier: 'new_answers',
    type: 'native',
    endPoint: 'answers/approvalQueue',
    processors: [],
  },
};

// TODO: add unit test
function getResourcesFromEndpoint(endpoint) {
  if (!endpoint) {
    console.error('endpoint parameter is missing.');
    throw new Error('endpoint parameter is missing');
    return;
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        collection: [
          {
            id: '12345-67890',
            status: 'pending',
          },
          {
            id: '23456-78901',
            status: 'pending',
          },
          {
            id: '34567-89012',
            status: 'in_resolution_process',
          },
          {
            id: '45678-90123',
            status: 'rejected',
          },
          {
            id: '56789-01234',
            status: 'approved',
          },
        ],
        paging: {
          currentPage: 1,
          currentItemCount: 10,
          itemCountPerPage: 10,
          totalItemCount: 12,
          totalPageCount: 2,
        },
        sorting: {
          sort: 'id',
          order: 'DESC',
        },
      });
    }, 500);
  });
}

export default io => {
  // fetch and store the native queues
  // upon socket.io server initialisation
  // the socket.io server will keep refreshing the queues
  // and broadcast to DASHBOARD_CHANNEL
  let _queues = _.clone(nativeQueues);

  function refreshQueues() {
    Promise
      .all(_.map(_queues, (queue = {}) => {
        // fetch new resource from the API when the queue.resources is empty
        return _.isEmpty(queue.resources) ? getResourcesFromEndpoint(queue.endPoint) : null;
      }))
      .then(values => {
        // update the queues with the API payload
        _.forEach(values, (value, index) => {
          if (!value) {
            return;
          }

          const queueKey = Object.keys(_queues)[index];
          const collection = _.get(value, 'collection');
          const resources = _.reduce(collection, (result, resource) => {
            const { id } = resource;

            result[id] = _.merge(resource, {
              queueId: queueKey,
              users: [],
            });
            return result;
          }, {});
          const remainingItems = _.get(value, 'paging.totalItemCount');

          // mutating _queue
          _.assign(_queues[queueKey], {
            resources,
            remainingItems,
          });
        });


        // broadcast the updated queues to DASHBOARD_CHANNEL
        io
          .to(DASHBOARD_CHANNEL)
          .emit(QUEUES_LOADED, _queues);
      })
      .catch(err => {
        console.error('error occurred when fetching resources', err);

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
  const clients = {};

  try {
    io.on('connection', socket => {
      console.info(`socket.io connection ID: ${socket.conn.id} established from ${socket.handshake.address}`);

      const socketId = socket.conn.id;

      // not sure yet if we should maintain a client list
      // it's available from io / socket object
      clients[socketId] = {
        queue: null,
        resource: null,
      };

      // on dashboard mounted,
      // user needs the queues data,
      // send the computed queues as payload
      socket.on(JOIN_DASHBOARD, (user = {}) => {
        console.info(`event '${JOIN_DASHBOARD}' received from ${socketId}`);

        // subscribe the user with the DASHBOARD_CHANNEL
        // so that the user will receive the updated queues broadcasting
        socket.join(DASHBOARD_CHANNEL);

        // send the most updated queues on hand
        // so the user does not have to wait for next broadcast
        socket.emit(QUEUES_LOADED, _queues);
      });

      socket.on(LEAVE_DASHBOARD, () => {
        console.info(`event '${LEAVE_DASHBOARD}' received from ${socketId}`);
        socket.leave(DASHBOARD_CHANNEL);
      });

      socket.on(JOIN_QUEUE, (data = {}) => {
        console.info(`event '${JOIN_QUEUE}' received from ${socketId}`);

        const { queueId, user } = data;

        if (!user) {
          console.error('user data is missing.');
          socket.emit(ERROR, { status: 401 });
          return;
        }

        if (!queueId) {
          console.error('queueId is missing.');
          socket.emit(ERROR, { status: 400 });
          return;
        }

        socket.join(`queue#${queueId}`);

        // add processor to _queues
        _.update(_queues, `${queueId}.processors`, processors => {
          processors.push(user);
          return processors;
        });

        // broadcast to DASHBOARD_CHANNEL
        io
          .to(DASHBOARD_CHANNEL)
          .emit(QUEUES_LOADED, _queues);

        // assign a resource to the user
        const resources = _.filter(_.get(_queues, `${queueId}.resources`), resource => resource.status === 'pending');
        const resource = resources && _.first(resources);

        socket
          .emit(UPDATE_RESOURCE, resource);
      });

      socket.on(LEAVE_QUEUE, (data = {}) => {
        console.info(`event '${LEAVE_QUEUE}' received from ${socketId}`);

        const { queueId, user } = data;

        socket.leave(`queue#${queueId}`);

        // remove processor from _queues
        _.update(_queues, `${queueId}.processors`, processors => processors.filter(processor => processor.name !== user.name));

        // broadcast to DASHBOARD_CHANNEL
        io
          .to(DASHBOARD_CHANNEL)
          .emit(QUEUES_LOADED, _queues);
      });

      // requiring access to a resource
      socket.on(JOIN_RESOURCE, (data = {}) => {
        console.info(`event '${JOIN_RESOURCE}' received from ${socketId}`);

        const { resource, user, timestamp } = data;

        if (!user) {
          console.error('user data is missing.');
          socket.emit(ERROR, { status: 401 });
          return;
        }

        if (!resource) {
          console.error('resource is missing.');
          socket.emit(ERROR, { status: 400 });
          return;
        }

        if (!timestamp) {
          console.error('timestamp is missing.');
          socket.emit(ERROR, { status: 400 });
          return;
        }

        const { id: resourceId, queueId } = resource;

        // clients[socketId].resource = resource;
        _.set(clients[socketId], `resource`, resource);

        const resourceToUpdate = _.get(_queues, `${queueId}.resources.${resourceId}`);

        _.update(resourceToUpdate, 'users', users => {
          users.push({
            ...user,
            timestamp,
          });
          return users;
        });

        // TODO: how to implement force lock?
        const sortedUser = _.sortBy(resourceToUpdate.users, user => user.timestamp);
        const locker = _.first(sortedUser);
        const watchers = _.takeRight(sortedUser, sortedUser.length - 1);

        resourceToUpdate.locker = locker;
        resourceToUpdate.watchers = watchers;

        // subscribe the user with the RESOURCE_ID_CHANNEL
        // so that the user will receive the related updates of resource
        socket.join(`resource#${resourceId}`);

        io
          .to(`resource#${resourceId}`)
          .emit(UPDATE_RESOURCE, resourceToUpdate);
      });

      // releasing access to a resource
      socket.on(LEAVE_RESOURCE, (data = {}) => {
        const { resource, user } = data;
        const { queueId, id: resourceId } = resource;

        // unsubscribe the user with the RESOURCE_ID_CHANNEL
        socket.leave(`resource#${resourceId}`, () => {

          // remove the footprint
          _.set(clients, `${socketId}.resource`, null);

          const resourceToUpdate = _.get(_queues, `${queueId}.resources.${resourceId}`);

          _.update(resourceToUpdate, 'users', users => _.filter(users, _user => _user.socketId !== socketId));

          const sortedUser = _.sortBy(resourceToUpdate.users, user => user.timestamp);
          const locker = _.first(sortedUser);
          const watchers = _.takeRight(sortedUser, sortedUser.length - 1);

          resourceToUpdate.locker = locker;
          resourceToUpdate.watchers = watchers;

          io
            .to(`resource#${resourceId}`)
            .emit(UPDATE_RESOURCE, resourceToUpdate);
        });
      });

      // when the user disconnected from the ws, e.g. closing browser
      socket.on('disconnect', () => {
        console.info(`socket ${socketId} disconnected.`);

        // remove processor from _queue
        _.forEach(_queues, _queue => {
          _.update(_queue, 'processors', processors => _.filter(processors, processor => processor.socketId !== socketId));
        });

        io
          .to(DASHBOARD_CHANNEL)
          .emit(QUEUES_LOADED, _queues);

        // remove locker or watcher from _queue.resources
        const { resource } = clients[socketId];

        // if the user is locking a resource
        if (resource) {
          const { queueId, id: resourceId } = resource;

          const resourceToUpdate = _.get(_queues, `${queueId}.resources.${resourceId}`);

          _.update(resourceToUpdate, 'users', users => _.filter(users, _user => _user.socketId !== socketId));

          const sortedUser = _.sortBy(resourceToUpdate.users, user => user.timestamp);
          const locker = _.first(sortedUser);
          const watchers = _.takeRight(sortedUser, sortedUser.length - 1);

          resourceToUpdate.locker = locker;
          resourceToUpdate.watchers = watchers;

          // remove user from memory
          delete clients[socketId];

          io
            .to(`resource#${resourceId}`)
            .emit(UPDATE_RESOURCE, resourceToUpdate);
        }
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