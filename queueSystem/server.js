import queryString from 'query-string';
import { createStore } from 'redux';
import appReducer from './reducer';
import * as actions from './actions';

import {
  JOIN_DASHBOARD,
  LEAVE_DASHBOARD,
  JOIN_QUEUE,
  LEAVE_QUEUE,
  CREATE_CUSTOM_QUEUE,
  CREATE_CUSTOM_QUEUE_SUCCESS,
  CREATE_CUSTOM_QUEUE_FAIL,
  JOIN_RESOURCE,
  LEAVE_RESOURCE,
  ASSIGN_RESOURCE,
  GET_NEXT_RESOURCE,
  SKIP_RESOURCE,
  REFRESH_QUEUE,
  REFRESH_QUEUES,
  REFRESH_RESOURCE,
  MARK_RESOURCE_AS_PROCESSED,
  CONNECTION,
  DISCONNECT,
  ERROR,
} from './events';

import {
  EMPTY_RESOURCE,
  DASHBOARD_CHANNEL,
  UPDATE_TIME_INTERVAL,
  nativeQueues,
} from './constants';

const debug = require('debug')('queueSystem:server.js');
const pettyError = new (require('pretty-error'))();

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
  let store = createStore(appReducer);

  // fetch and store the native queues
  // upon socket.io server initialisation
  // the socket.io server will keep refreshing the queues
  // and broadcast to DASHBOARD_CHANNEL
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
          data.remainingItems[queueId] = remainingItems;

          return data;
        }, { remainingItems: {}, resources: [] });

        store.dispatch(actions.addFetchedResources(newData));
        const state = store.getState();

        // broadcast the updated queues to DASHBOARD_CHANNEL
        io
          .to(DASHBOARD_CHANNEL)
          .emit(REFRESH_QUEUES, state.queues);

        // broadcast the updated queue to QUEUE_CHANNEL
        queueIds.forEach(queueId => {
          io.to(getQueueChannel(queueId)).emit(REFRESH_QUEUE, Object.assign({}, state.queues.find(queue => queue.id === queueId), {
            numOfPendingItems: state.resources.filter(resource => resource.queueId === queueId && !state.processedResources.includes(resource.id)).length,
          }));
        });
      })
      .catch(err => {
        console.error('error occurred when fetching resources');
        console.error(pettyError.render(err));

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

  /**
   * @method getResourceInProcess
   * to get the resource id(s) for the resource(s) being processed by client(s)
   *
   * @returns Array
   */
  function getResourcesInProcess() {
    const state = store.getState();

    return state.clients.reduce((resources, client) => {
      if (client.resourceId) {
        resources.push(client.resourceId);
      }

      return resources;
    }, []);
  }

  /**
   * @method getPendingResourcesByQueueId
   *
   * @param queueId {String}
   * @returns {*}
   */
  function getPendingResourcesByQueueId(queueId) {
    const state = store.getState();

    return state.resources
      .filter(resource => resource.queueId === queueId)
      .filter(resource => !state.processedResources
        .find(processedResource => processedResource.queueId === queueId && processedResource.resourceId === resource.id))
      .filter(resource => !(getResourcesInProcess()).includes(resource.id));
  }

  function getClientBySocketId(socketId) {
    const state = store.getState();
    return state.clients.find(client => client.socketId === socketId);
  }

  try {
    io.on(CONNECTION, socket => {
      const socketId = socket.conn.id;
      const ipAddr = socket.handshake.address;
      const { cookie, userId, username } = socket.handshake.query;

      debug(`socket.io connection ID: ${socketId} established from ${ipAddr}`);

      // TODO:
      // refine the needed data, e.g. cookie
      if (!username) {
        debug(`insufficient data from connection ID: ${socketId}`);
        socket.disconnect();
        return;
      }

      // TODO:
      // verify the cookie via API
      // checkAuth(userData).then(addClient).catch(disconnectClient)

      store.dispatch(actions.addClient({ socketId, username }));

      // on dashboard mounted,
      // user needs the queues data,
      // send the computed queues as payload
      socket.on(JOIN_DASHBOARD, (user = {}) => {
        debug(`event '${JOIN_DASHBOARD}' received from ${socketId}`);
        socket.join(DASHBOARD_CHANNEL, () => {
          const state = store.getState();
          socket.emit(REFRESH_QUEUES, state.queues);
        });
      });

      // leave and stop receiving signal from dashboard channel
      socket.on(LEAVE_DASHBOARD, () => {
        debug(`event '${LEAVE_DASHBOARD}' received from ${socketId}`);
        socket.leave(DASHBOARD_CHANNEL);
      });

      socket.on(JOIN_QUEUE, (payload = {}) => {
        debug(`event '${JOIN_QUEUE}' received from ${socketId}`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          console.error(`client ${socketId} does not exist.`);
          socket.emit(ERROR, {
            status: 401,
            message: 'unauthorized access',
          });
          return;
        }

        const { queueId } = payload;
        if (!queueId) {
          console.error('`queueId` is missing');
          socket.emit(ERROR, {
            status: 400,
            message: '`queueId` is missing',
          });
          return;
        }

        const { queueId: currentQueueId } = client;
        // assuming a client cannot process two queues at the same time
        if (currentQueueId) {
          store.dispatch(actions.leaveQueue(socketId));
          socket.leave(getQueueChannel(currentQueueId), () => {
            const state = store.getState();
            io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
          });
        }

        store.dispatch(actions.joinQueue(socketId, queueId));
        socket.join(getQueueChannel(queueId), () => {
          const state = store.getState();
          io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);

          const pendingResources = getPendingResourcesByQueueId(queueId);
          const nextResource = pendingResources.length > 0 ? pendingResources[0] : EMPTY_RESOURCE;
          socket.emit(ASSIGN_RESOURCE, nextResource);
        });
      });

      socket.on(LEAVE_QUEUE, () => {
        debug(`event '${LEAVE_QUEUE}' received from ${socketId}`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          console.error(`client ${socketId} does not exist.`);
          socket.emit(ERROR, {
            status: 401,
            message: 'unauthorized access',
          });
          return;
        }

        const { queueId } = client;
        if (!queueId) {
          debug('client is not in any queue.');
          return;
        }

        store.dispatch(actions.leaveQueue(socketId));
        socket.leave(getQueueChannel(queueId), () => {
          const state = store.getState();
          io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
        });
      });

      socket.on(CREATE_CUSTOM_QUEUE, (payload = {}) => {
        debug(`event '${CREATE_CUSTOM_QUEUE}' received from ${socketId}`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          console.error(`client ${socketId} does not exist.`);
          socket.emit(ERROR, {
            status: 401,
            message: 'unauthorized access',
          });
          return;
        }

        if (!payload.name || !payload.type) {
          console.error(`queue name or queue type is missing.`);
          socket.emit(CREATE_CUSTOM_QUEUE_FAIL, {
            status: 400,
            message: 'query data is missing',
          });
          return;
        }

        let state = store.getState();
        const existingCustomQueue = state.queues.find(queue => (queue.name && queue.name.toLowerCase()) === (payload.name && payload.name.toLowerCase()));

        // queue name should be unique
        if (existingCustomQueue) {
          console.error(`custom queue name ${payload.name} already exists`);
          socket.emit(CREATE_CUSTOM_QUEUE_FAIL, {
            status: 409,
            message: 'custom queue already exists',
          });
          return;
        }

        getResourcesFromEndpoint(payload.name, `/api/${payload.type}/search${payload.query && `?${queryString.stringify(payload.query)}`}`)
          .then(result => {
            // TODO: normaliseResource()
            const resources = result.collection.reduce((resources, resource) => {
              resources.push(Object.assign({}, resource, { queueId: payload.name, watchers: [] }));
              return resources;
            }, []);

            store.dispatch(actions.createQueue(payload.name, resources));
            state = store.getState();
            io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
            socket.emit(CREATE_CUSTOM_QUEUE_SUCCESS, state.queues[state.queues.length - 1]);
          })
      });

      socket.on(GET_NEXT_RESOURCE, () => {
        debug(`event '${GET_NEXT_RESOURCE}' received from ${socketId}`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          console.error(`client ${socketId} does not exist.`);
          socket.emit(ERROR, {
            status: 401,
            message: 'unauthorized access',
          });
          return;
        }

        const { queueId } = client;
        if (!queueId) {
          console.error('client is not in any queue');
          socket.emit(ERROR, {
            status: 500,
            message: 'user is not in any queue',
          });
          return;
        }

        const pendingResources = getPendingResourcesByQueueId(queueId);
        const nextResource = pendingResources.length > 0 ? pendingResources[0] : EMPTY_RESOURCE;
        socket.emit(ASSIGN_RESOURCE, nextResource);
      });

      socket.on(SKIP_RESOURCE, () => {
        debug(`event '${SKIP_RESOURCE}' received from ${socketId}`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          console.error(`client ${socketId} does not exist.`);
          socket.emit(ERROR, {
            status: 401,
            message: 'unauthorized access',
          });
          return;
        }

        const { queueId, resourceId } = client;
        if (!queueId || !resourceId) {
          console.error('client is not in any queue or resource');
          socket.emit(ERROR, {
            status: 500,
            message: 'user is not in any queue or resource',
          });
          return;
        }

        let state = store.getState();
        const currentQueue = state.queues.find(queue => queue.id === queueId);
        const queueType = currentQueue.type;

        // if the user is in a custom queue
        // put the resource to the last index of the sequence
        if (queueType === 'custom') {
          store.dispatch(actions.skipResource(socketId));
          state = store.getState();
        }

        const pendingResources = getPendingResourcesByQueueId(queueId);
        const currentIndex = pendingResources.findIndex(resource => resource.id === resourceId);

        // if there is no more pending resources
        // return an empty resource
        let nextResource = EMPTY_RESOURCE;

        // unknown current index, assign the first
        if (pendingResources.length > 0) {
          if (currentIndex === -1 || currentIndex >= pendingResources.length - 1) {
            nextResource = pendingResources[0];
          } else if (currentIndex < pendingResources.length - 1) {
            nextResource = pendingResources[currentIndex + 1];
          }
        }

        // no state change in this process, so no need to broadcast changes
        socket.emit(ASSIGN_RESOURCE, nextResource);
      });

      // requiring access to a resource
      socket.on(JOIN_RESOURCE, (data = {}) => {
        debug(`event '${JOIN_RESOURCE}' received from ${socketId}`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          console.error(`client ${socketId} does not exist.`);
          socket.emit(ERROR, {
            status: 401,
            message: 'unauthorized access',
          });
          return;
        }

        const { resourceId: currentResourceId } = client;
        const { resourceId } = data;

        // if the user requested to join the same resource,
        // no action is required
        if (currentResourceId === resourceId) {
          return;
        }

        if (currentResourceId) {
          store.dispatch(actions.leaveResource(socketId));
          socket.leave(getResourceChannel(currentResourceId), () => {
            const state = store.getState();
            io.to(getResourceChannel(currentResourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === currentResourceId));
          });
        }

        if (resourceId) {
          store.dispatch(actions.joinResource(socketId, resourceId));
          socket.join(getResourceChannel(resourceId), () => {
            const state = store.getState();
            io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
          });
        }
      });

      // releasing access to a resource
      socket.on(LEAVE_RESOURCE, () => {
        debug(`event '${LEAVE_RESOURCE}' received from ${socketId}`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          console.error(`client ${socketId} does not exist.`);
          socket.emit(ERROR, {
            status: 401,
            message: 'unauthorized access',
          });
          return;
        }

        const { resourceId } = client;
        if (!resourceId) {
          console.error('client is not in any resource');
          socket.emit(ERROR, {
            status: 500,
            message: 'user is not in any resource',
          });
          return;
        }

        store.dispatch(actions.leaveResource(socketId));
        socket.leave(getResourceChannel(resourceId), () => {
          const state = store.getState();
          io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
        });
      });

      socket.on(MARK_RESOURCE_AS_PROCESSED, () => {
        debug(`event '${MARK_RESOURCE_AS_PROCESSED}' received from ${socketId}`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          console.error(`client ${socketId} does not exist.`);
          socket.emit(ERROR, {
            status: 401,
            message: 'unauthorized access',
          });
          return;
        }

        const { queueId, resourceId } = client;
        if (!resourceId) {
          console.error('client is not in any resource');
          socket.emit(ERROR, {
            status: 500,
            message: 'user is not in any resource',
          });
          return;
        }

        store.dispatch(actions.markResourceAsProcessed(socketId));
        let state = store.getState();
        const queue = state.queues.find(queue => queue.id === queueId);
        const pendingResources = getPendingResourcesByQueueId(queueId);

        io.to(getQueueChannel(queueId)).emit(REFRESH_QUEUE, Object.assign({}, queue, {
          numOfPendingItems: pendingResources.length,
        }));

        if (queue.type === 'custom') {
          store.dispatch(actions.updateQueueRemainingItem(queueId, pendingResources.length));
          state = store.getState();
          io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
        }

        // TODO: store.getResourceById(resourceId)
        io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));

        const currentIndex = pendingResources.findIndex(resource => resource.id === resourceId);

        // if there is no more pending resources
        // return an empty resource
        let nextResource = EMPTY_RESOURCE;

        // unknown current index, assign the first
        if (pendingResources.length > 0) {
          if (currentIndex === -1 || currentIndex >= pendingResources.length - 1) {
            nextResource = pendingResources[0];
          } else if (currentIndex < pendingResources.length - 1) {
            nextResource = pendingResources[currentIndex + 1];
          }
        }

        socket.emit(ASSIGN_RESOURCE, nextResource);
      });

      // when the user disconnected from the ws, e.g. closing browser
      socket.on(DISCONNECT, () => {
        debug(`socket ${socketId} disconnected.`);

        const client = getClientBySocketId(socketId);
        if (!client) {
          debug(`client ${socketId} does not exist.`);
          return;
        }

        store.dispatch(actions.disconnect(socketId));

        const { queueId, resourceId } = client;
        if (queueId) {
          socket.leave(getResourceChannel(queueId), () => {
            const state = store.getState();
            io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
          });
        }
        if (resourceId) {
          socket.leave(getResourceChannel(resourceId), () => {
            const state = store.getState();
            io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
          });
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