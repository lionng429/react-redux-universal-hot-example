import _ from 'lodash';
import {
  JOIN_DASHBOARD,
  LEAVE_DASHBOARD,
  JOIN_QUEUE,
  LEAVE_QUEUE,
  JOIN_RESOURCE,
  LEAVE_RESOURCE,
  ASSIGN_RESOURCE,
  GET_LAST_RESOURCE,
  GET_NEXT_RESOURCE,
  SKIP_RESOURCE,
  FETCH_RESOURCES,
  REFRESH_QUEUE,
  REFRESH_QUEUES,
  REFRESH_RESOURCE,
  MARK_RESOURCE_AS_PROCESSED,
  CONNECTION,
  DISCONNECT,
  LOGIN,
  ERROR,
} from './events';

const DASHBOARD_CHANNEL = 'dashboard';
const UPDATE_TIME_INTERVAL = 5 * 1000;

const nativeQueues = [
  {
    identifier: 'new_reviews',
    type: 'native',
    endPoint: 'reviews/approvalQueue',
  },
  {
    identifier: 'new_comments',
    type: 'native',
    endPoint: 'comments/approvalQueue',
  },
  {
    identifier: 'new_questions',
    type: 'native',
    endPoint: 'questions/approvalQueue',
  },
  {
    identifier: 'new_answers',
    type: 'native',
    endPoint: 'answers/approvalQueue',
  },
];

// TODO: add unit test
function getResourcesFromEndpoint(queueId, endpoint) {
  if (!queueId) {
    console.error('`queueId` is missing.')
    throw new Error('`queueId` is missing');
    return;
  }

  if (!endpoint) {
    console.error('`endpoint` is missing.');
    throw new Error('`endpoint` is missing');
    return;
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        queueId,
        collection: [
          {
            type: 'entry',
            id: '12345-67890',
            name: 'Resource 1',
            status: 'pending',
          },
          {
            type: 'external_entry',
            id: '23456-78901',
            name: 'Resource 2',
            status: 'pending',
          },
          {
            type: 'external_entry',
            id: '34567-89012',
            name: 'Resource 3',
            status: 'in_resolution_process',
          },
          {
            type: 'entry',
            id: '45678-90123',
            name: 'Resource 4',
            status: 'rejected',
          },
          {
            type: 'entry',
            id: '56789-01234',
            name: 'Resource 5',
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
  let state = {
    clients: [],
    queues: nativeQueues.map((queue = {}) => Object.assign({}, {
      type: queue.type,
      id: queue.identifier,
      remainingItems: 0,
      processors: [],
    })),
    resources: [],
    processedResources: [],
  };

  function refreshQueues() {
    Promise
      .all(nativeQueues.map((queue = {}) => {
        // fetch new resource from the API when the queue.resources is empty
        // return _.isEmpty(queue.resources) ? getResourcesFromEndpoint(queue.endPoint) : null;
        return getResourcesFromEndpoint(queue.identifier, queue.endPoint);
      }))
      .then((values = []) => {
        const queueIds = values.reduce((ids, value) => {
          if (!value) {
            return;
          }

          ids.push(value.queueId);

          return ids;
        }, []);

        // update the queues with the API payload
        const newData = values.reduce((data, value) => {
          if (!value) {
            return;
          }

          const { queueId, collection } = value;

          const resources = collection.reduce((resources, resource) => {
            resources.push({
              queueId,
              ...resource,
              watchers: [],
            });

            return resources;
          }, []);

          const remainingItems = value.paging.totalItemCount;

          data.resources = data.resources.concat(resources);
          data[queueId] = { remainingItems };

          return data;
        }, { resources: [] });

        state = reducer(state, FETCH_RESOURCES, newData);

        // broadcast the updated queues to DASHBOARD_CHANNEL
        io
          .to(DASHBOARD_CHANNEL)
          .emit(REFRESH_QUEUES, state.queues);

        // broadcast the updated queue to QUEUE_CHANNEL
        queueIds.forEach(queueId => {
          io.to(getQueueChannel(queueId)).emit(REFRESH_QUEUE, state.queues.find(queue => queue.id === queueId));
        })
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

  // what if error occurred with the API?w
  // should set a maximum number of retry for setInterval
  const queuesRefresh = setInterval(refreshQueues, UPDATE_TIME_INTERVAL);

  function getResourceChannel(resourceId) {
    return `resource#${resourceId}}`;
  }

  function getQueueChannel(queueId) {
    return `queue#${queueId}`;
  }

  function reducer(state, event, data = {}) {
    const user = Object.assign({}, state.clients.find(client => client.socketId === data.socketId));

    switch (event) {
      case LOGIN:
        return {
          ...state,
          clients: state.clients.concat([{
            socketId: data.socketId,
            id: data.id,
            name: data.name,
            queueId: null,
            resourceId: null,
          }]),
        };

      case JOIN_QUEUE:
        return {
          ...state,
          clients: state.clients.map(client => client.socketId !== user.socketId ? client : Object.assign(user, { queueId: data.queueId })),
          queues: state.queues.map(queue => queue.id !== data.queueId ? queue : Object.assign({}, queue, {
            processors: queue.processors.concat([user]),
          })),
        };

      case LEAVE_QUEUE:
        return {
          ...state,
          clients: state.clients.map(client => client.socketId !== user.socketId ? client : Object.assign({}, user, { queueId: null })),
          queues: state.queues.map(queue => queue.id !== user.queueId ? queue : Object.assign({}, queue, {
            processors: queue.processors.filter(processor => processor.socketId !== user.socketId),
          })),
        };

      case FETCH_RESOURCES:
        return {
          ...state,
          queues: state.queues.map(queue => Object.assign({}, queue, {
            remainingItems: data[queue.id].remainingItems
          })),
          resources: state.resources.concat(data.resources.filter(resource => !state.resources.map(resource => resource.id).includes(resource.id))),
        };

      case JOIN_RESOURCE:
        return {
          ...state,
          clients: state.clients.map(client => client.socketId !== user.socketId ? client : Object.assign(user, { resourceId: data.resourceId })),
          resources: state.resources.map(resource => resource.id !== data.resourceId ? resource : Object.assign({}, resource, {
            watchers: resource.watchers.concat([user])
          })),
        };

      case LEAVE_RESOURCE:
        return {
          ...state,
          clients: state.clients.map(client => client.socketId !== user.socketId ? client : Object.assign({}, user, { resourceId: null })),
          resources: state.resources.map(resource => resource.id !== user.resourceId ? resource : Object.assign({}, resource, {
            watchers: resource.watchers.filter(watcher => watcher.socketId !== user.socketId),
          })),
        };

      case DISCONNECT:
        return {
          ...state,
          clients: state.clients.filter(client => client.socketId !== user.socketId),
          queues: !(user && user.resourceId) ? state.queues : state.queues.map(queue => queue.id !== user.queueId ? queue : Object.assign({}, queue, {
            processors: queue.processors.filter(processor => processor.socketId !== user.socketId),
          })),
          resources: !(user && user.resourceId) ? state.resources : state.resources.map(resource => resource.id !== user.resourceId ? resource : Object.assign({}, resource, {
            watchers: resource.watchers.filter(watcher => watcher.socketId !== user.socketId),
          })),
        };

      default:
        return state;
    }
  }

  function getQueues() {

  }

  try {
    io.on(CONNECTION, socket => {
      console.info(`socket.io connection ID: ${socket.conn.id} established from ${socket.handshake.address}`);

      const socketId = socket.conn.id;

      socket.on(LOGIN, (user = {}) => {
        console.info(`event '${LOGIN}' received from ${socketId}`);

        // verify the user via PHP API

        state = reducer(state, LOGIN, { socketId, ...user });
      });

      // on dashboard mounted,
      // user needs the queues data,
      // send the computed queues as payload
      socket.on(JOIN_DASHBOARD, (user = {}) => {
        console.info(`event '${JOIN_DASHBOARD}' received from ${socketId}`);

        socket.join(DASHBOARD_CHANNEL);
        socket.emit(REFRESH_QUEUES, state.queues);
      });

      socket.on(LEAVE_DASHBOARD, () => {
        console.info(`event '${LEAVE_DASHBOARD}' received from ${socketId}`);

        socket.leave(DASHBOARD_CHANNEL);
      });

      socket.on(JOIN_QUEUE, (data = {}) => {
        console.info(`event '${JOIN_QUEUE}' received from ${socketId}`);

        const { queueId: currentQueueId } = state.clients.find((client = {}) => client.socketId === socketId) || {};
        const { queueId } = data;

        if (!queueId) {
          console.error('`queueId` is missing');

          socket.emit(ERROR, {
            status: 400,
            message: '`queueId` is missing',
          });

          return;
        }

        // assuming a client cannot process two queues at the same time
        if (currentQueueId) {
          socket.leave(getQueueChannel(currentQueueId), () => {
            state = reducer(state, LEAVE_QUEUE, { socketId });
            io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
          });
        }

        socket.join(getQueueChannel(queueId), () => {
          state = reducer(state, JOIN_QUEUE, { socketId, queueId });

          io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);

          // TODO: store.getAvailableResource()
          socket.emit(ASSIGN_RESOURCE, state.resources
            .filter(resource => resource.queueId === queueId)
            .find(resource => !state.processedResources.includes(resource.id))
          );
        });
      });

      socket.on(LEAVE_QUEUE, () => {
        console.info(`event '${LEAVE_QUEUE}' received from ${socketId}`);

        const { queueId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (!queueId) {
          console.info('client is not in any queue');
          return;
        }

        socket.leave(getQueueChannel(queueId), () => {
          state = reducer(state, LEAVE_QUEUE, { socketId });

          io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
        });
      });

      socket.on(GET_LAST_RESOURCE, (data = {}) => {
        console.info(`event '${GET_LAST_RESOURCE}' received from ${socketId}`);
      });

      socket.on(GET_NEXT_RESOURCE, (data = {}) => {
        console.info(`event '${GET_NEXT_RESOURCE}' received from ${socketId}`);

        const { queueId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (!queueId) {
          console.info('client is not in any queue');
          return;
        }

        socket.emit(ASSIGN_RESOURCE, state.resources
          .filter(resource => resource.queueId === queueId)
          .find(resource => !state.processedResources.includes(resource.id))
        );
      });

      socket.on(SKIP_RESOURCE, (data = {}) => {
        console.info(`event '${GET_NEXT_RESOURCE}' received from ${socketId}`);

        const { queueId, resourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (!queueId) {
          console.info('client is not in any queue');
          return;
        }

        if (!resourceId) {
          console.info('client is not in any resource');
          return;
        }

        // TODO: store.getNextAvailableResource
        const pendingResources = state.resources
          .filter(resource => resource.queueId === queueId)
          .filter(resource => !state.processedResources.includes(resource.id));

        const currentIndex = pendingResources.findIndex(resource => resource.id === resourceId);

        const nextResource = currentIndex < pendingResources.length - 1 && nextResource > -1 ? pendingResources[currentIndex + 1] : {};

        socket.emit(ASSIGN_RESOURCE, nextResource, () => {
          io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
        });
      });

      // requiring access to a resource
      socket.on(JOIN_RESOURCE, (data = {}) => {
        console.info(`event '${JOIN_RESOURCE}' received from ${socketId}`);

        // TODO: store.getClientBySocketId(socketId)
        const { resourceId: currentResourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (currentResourceId) {
          socket.leave(getResourceChannel(currentResourceId), () => {
            // TODO: store.getResourceById(currentResourceId)
            io.to(getResourceChannel(currentResourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === currentResourceId));
          });
        }

        const { resourceId } = data;

        if (resourceId) {
          state = reducer(state, JOIN_RESOURCE, {
            socketId,
            resourceId,
          });

          socket.join(getResourceChannel(resourceId), () => {
            // TODO: store.getResourceById(resourceId)
            io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
          });
        }
      });

      // releasing access to a resource
      socket.on(LEAVE_RESOURCE, () => {
        console.info(`event '${LEAVE_RESOURCE}' received from ${socketId}`);

        // TODO: store.getClientBySocketId(socketId)
        const { resourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (!resourceId) {
          console.info('client is not in any resource');
          return;
        }

        state = reducer(state, LEAVE_RESOURCE, { socketId });

        // TODO: store.getResourceById(resourceId)
        io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
      });

      socket.on(MARK_RESOURCE_AS_PROCESSED, () => {
        console.info(`event '${MARK_RESOURCE_AS_PROCESSED}' received from ${socketId}`);

        // TODO: store.getClientBySocketId(socketId)
        const { resourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (!resourceId) {
          console.info('client is not in any resource');
          return;
        }

        state = reducer(state, MARK_RESOURCE_AS_PROCESSED, { socketId });

        // TODO: store.getResourceById(resourceId)
        io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
      });

      // when the user disconnected from the ws, e.g. closing browser
      socket.on(DISCONNECT, () => {
        console.info(`socket ${socketId} disconnected.`);

        // TODO: store.getClientBySocketId(socketId)
        const { queueId, resourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        state = reducer(state, DISCONNECT, { socketId });

        if (queueId) {
          socket.leave(getResourceChannel(queueId));

          io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
        }

        if (resourceId) {
          socket.leave(getResourceChannel(resourceId));

          // TODO: store.getResourceById(resourceId)
          io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
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