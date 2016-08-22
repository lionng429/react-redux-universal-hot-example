import { createStore } from 'redux';
import appReducer from './reducer';
import * as actions from './actions';
import _ from 'lodash';
import {
  JOIN_DASHBOARD,
  LEAVE_DASHBOARD,
  JOIN_QUEUE,
  LEAVE_QUEUE,
  JOIN_RESOURCE,
  LEAVE_RESOURCE,
  ASSIGN_RESOURCE,
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
import {
  DASHBOARD_CHANNEL,
  UPDATE_TIME_INTERVAL,
  nativeQueues,
} from './constants';

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
          data[queueId] = { remainingItems };

          return data;
        }, { resources: [] });

        store.dispatch(actions.fetchResources(newData));
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

  try {
    io.on(CONNECTION, socket => {
      console.info(`socket.io connection ID: ${socket.conn.id} established from ${socket.handshake.address}`);

      const socketId = socket.conn.id;

      socket.on(LOGIN, (user = {}) => {
        console.info(`event '${LOGIN}' received from ${socketId}`);

        // verify the user via PHP API

        store.dispatch(actions.login({
          socketId,
          ...user,
        }));
      });

      // on dashboard mounted,
      // user needs the queues data,
      // send the computed queues as payload
      socket.on(JOIN_DASHBOARD, (user = {}) => {
        console.info(`event '${JOIN_DASHBOARD}' received from ${socketId}`);

        const state = store.getState();

        socket.join(DASHBOARD_CHANNEL);
        socket.emit(REFRESH_QUEUES, state.queues);
      });

      socket.on(LEAVE_DASHBOARD, () => {
        console.info(`event '${LEAVE_DASHBOARD}' received from ${socketId}`);

        socket.leave(DASHBOARD_CHANNEL);
      });

      socket.on(JOIN_QUEUE, (data = {}) => {
        console.info(`event '${JOIN_QUEUE}' received from ${socketId}`);

        const state = store.getState();
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
            store.dispatch(actions.leaveQueue({ socketId, queueId }));
            const state = store.getState();

            io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
          });
        }

        socket.join(getQueueChannel(queueId), () => {
          store.dispatch(actions.joinQueue({ socketId, queueId }));
          const state = store.getState();

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

        const state = store.getState();
        const { queueId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (!queueId) {
          console.info('client is not in any queue');
          return;
        }

        socket.leave(getQueueChannel(queueId), () => {
          store.dispatch(actions.leaveQueue({ socketId }));
          const state = store.getState();
          // state = reducer(state, LEAVE_QUEUE, { socketId });

          io.to(DASHBOARD_CHANNEL).emit(REFRESH_QUEUES, state.queues);
        });
      });

      socket.on(GET_NEXT_RESOURCE, (data = {}) => {
        console.info(`event '${GET_NEXT_RESOURCE}' received from ${socketId}`);

        const state = store.getState();
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
        console.info(`event '${SKIP_RESOURCE}' received from ${socketId}`);

        const state = store.getState();
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

        // if there is no more pending resources
        // return an empty resource
        let nextResource = {};

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
        console.info(`event '${JOIN_RESOURCE}' received from ${socketId}`);

        // TODO: store.getClientBySocketId(socketId)
        const state = store.getState();
        const { resourceId: currentResourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};
        const { resourceId } = data;

        // if the user requested to join the same resource,
        // no action is required
        if (currentResourceId === resourceId) {
          return;
        }

        if (currentResourceId) {
          store.dispatch(actions.leaveResource({ socketId }));
          const state = store.getState();
          // state = reducer(state, LEAVE_RESOURCE, { socketId });

          socket.leave(getResourceChannel(currentResourceId), () => {
            // TODO: store.getResourceById(currentResourceId)
            io.to(getResourceChannel(currentResourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === currentResourceId));
          });
        }

        if (resourceId) {
          store.dispatch(actions.joinResource({ socketId, resourceId }));
          const state = store.getState();

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
        const state = store.getState();
        const { resourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (!resourceId) {
          console.info('client is not in any resource');
          return;
        }

        socket.leave(getResourceChannel(resourceId), () => {
          store.dispatch(actions.leaveResource({ socketId }));
          const state = store.getState();
          // TODO: store.getResourceById(resourceId)
          io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
        });
      });

      socket.on(MARK_RESOURCE_AS_PROCESSED, () => {
        console.info(`event '${MARK_RESOURCE_AS_PROCESSED}' received from ${socketId}`);

        // TODO: store.getClientBySocketId(socketId)
        let state = store.getState();
        const { resourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        if (!resourceId) {
          console.info('client is not in any resource');
          return;
        }

        store.dispatch(action.markResourceAsProcessed({ socketId, resourceId }));
        state = store.getState();
        const resource = state.resources.find((resource = {}) => resource.id === resourceId);
        const { queueId } = resource;

        io.to(getQueueChannel(queueId)).emit(REFRESH_QUEUE, Object.assign({}, state.queues.find(queue => queue.id === queueId), {
          numOfPendingItems: state.resources.filter(resource => resource.queueId === queue.id && !state.processedResources.includes(resource.id)).length,
        }));

        // TODO: store.getResourceById(resourceId)
        io.to(getResourceChannel(resourceId)).emit(REFRESH_RESOURCE, state.resources.find((resource = {}) => resource.id === resourceId));
      });

      // when the user disconnected from the ws, e.g. closing browser
      socket.on(DISCONNECT, () => {
        console.info(`socket ${socketId} disconnected.`);

        // TODO: store.getClientBySocketId(socketId)
        let state = store.getState();
        const { queueId, resourceId } = state.clients.find((client = {}) => client.socketId === socketId) || {};

        store.dispatch(actions.disconnect({ socketId }));
        state = store.getState();

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