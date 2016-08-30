import { createStore } from 'redux';
import appReducer from './reducer';
import * as actions from './actions';
import {
  JOIN_RESOURCE,
  LEAVE_RESOURCE,
  ADD_LOCKER_TO_RESOURCE,
  FORCE_LOCK_RESOURCE,
  REMOVE_LOCKER_FROM_RESOURCE,
  UPDATE_RESOURCE_LOCKER,
} from './events';

function getResourceChannel(resourceId) {
  return `resource#${resourceId}}`;
}

export default io => {
  let store = createStore(appReducer);

  try {
    io.on('connection', socket => {
      const socketId = socket.conn.id;
      const ipAddr = socket.handshake.address;
      const { cookie, userId, username } = socket.handshake.query;

      console.info(`[lock system] socket.io connection ID: ${socketId} established from ${ipAddr}`);

      // TODO:
      // refine the needed data, e.g. cookie
      if (!username) {
        console.info(`[lock system] insufficient data from connection ID: ${socketId}`);
        socket.disconnect();
        return;
      }

      // TODO:
      // verify the cookie via API
      // checkAuth(userData).then(addClient).catch(disconnectClient)

      store.dispatch(actions.addClient({ socketId, username }));

      // upon registering as a locker of a resource
      // the system will firstly force the client to leave the joined resource if any
      // and add the client to the locker queue of the joining resource
      socket.on(ADD_LOCKER_TO_RESOURCE, (data = {}) => {
        console.info(`[lock system] event '${ADD_LOCKER_TO_RESOURCE}' received from ${socketId}`);

        const state = store.getState();
        const user = state.clients.find(client => client.socketId === socketId) || {};
        const { resourceId: leavingResourceId } = user;

        if (leavingResourceId) {
          console.info(`[lock system] client's joined resource detected from ${socketId}: ${leavingResourceId}`);

          socket.leave(getResourceChannel(leavingResourceId), () => {
            store.dispatch(actions.removeLocker(socketId));
            const state = store.getState();

            io.to(getResourceChannel(leavingResourceId))
              .emit(UPDATE_RESOURCE_LOCKER, {
                locker: state.resources[leavingResourceId] && state.resources[leavingResourceId].watchers[0],
                watchers: state.resources[leavingResourceId] && state.resources[leavingResourceId].watchers.filter((val, index) => index > 0),
              });
          });
        }

        const { resourceId: joiningResourceId } = data;

        if (!joiningResourceId) {
          console.error('resourceId is missing.');
          return;
        }

        socket.join(getResourceChannel(joiningResourceId), () => {
          store.dispatch(actions.addLocker({
            socketId,
            resourceId: joiningResourceId,
            forceLock: false,
          }));

          const state = store.getState();

          console.info(`[lock system] emitting ${UPDATE_RESOURCE_LOCKER} to channel ${getResourceChannel(joiningResourceId)}`);

          io.to(getResourceChannel(joiningResourceId))
            .emit(UPDATE_RESOURCE_LOCKER, {
              locker: state.resources[joiningResourceId] && state.resources[joiningResourceId].watchers[0],
              watchers: state.resources[joiningResourceId] && state.resources[joiningResourceId].watchers.filter((val, index) => index > 0),
            });
        });
      });


      socket.on(FORCE_LOCK_RESOURCE, () => {
        console.info(`[lock system] event '${FORCE_LOCK_RESOURCE}' received from ${socketId}`);

        let state = store.getState();
        const user = state.clients.find(client => client.socketId === socketId) || {};
        const { resourceId } = user;

        if (!resourceId) {
          console.error('[lock system] client is not in any resource.');
          return;
        }

        store.dispatch(actions.forceLock(socketId));
        state = store.getState();

        console.info(`[lock system] emitting ${UPDATE_RESOURCE_LOCKER} to channel ${getResourceChannel(resourceId)}`);

        io.to(getResourceChannel(resourceId))
          .emit(UPDATE_RESOURCE_LOCKER, {
            locker: state.resources[resourceId] && state.resources[resourceId].watchers[0],
            watchers: state.resources[resourceId] && state.resources[resourceId].watchers.filter((val, index) => index > 0),
          });
      });

      // REMOVE_LOCKER_FROM_RESOURCE is for the client leaving the resource but not joining a new one
      socket.on(REMOVE_LOCKER_FROM_RESOURCE, () => {
        console.info(`[lock system] event '${REMOVE_LOCKER_FROM_RESOURCE}' received from ${socketId}`);

        const state = store.getState();
        const user = state.clients.find(client => client.socketId === socketId) || {};
        const { resourceId } = user;

        if (!resourceId) {
          console.error(`[lock system] client is not on any resource`);
          return;
        }

        socket.leave(getResourceChannel(resourceId), () => {
          store.dispatch(actions.removeLocker(socketId));
          const state = store.getState();

          io.to(getResourceChannel(resourceId))
            .emit(UPDATE_RESOURCE_LOCKER, {
              locker: state.resources[resourceId] && state.resources[resourceId].watchers[0],
              watchers: state.resources[resourceId] && state.resources[resourceId].watchers.filter((val, index) => index > 0),
            });
        });
      });

      // when the user disconnected from the ws, e.g. closing browser
      // the system will remove the client from the clients array,
      // and remove the client from the locker queue of the joined resource if any
      socket.on('disconnect', () => {
        console.info(`[lock system] socket ${socketId} disconnected.`);

        let state = store.getState();
        const user = state.clients.find(client => client.socketId === socketId) || {};
        const { resourceId } = user;

        store.dispatch(actions.removeClient(socketId));

        state = store.getState();

        if (resourceId) {
          io.to(getResourceChannel(resourceId))
            .emit(UPDATE_RESOURCE_LOCKER, {
              locker: state.resources[resourceId] && state.resources[resourceId].watchers[0],
              watchers: state.resources[resourceId] && state.resources[resourceId].watchers.filter((val, index) => index > 0),
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
    console.error('[lock system] failed to initialise Socket.io connection on server');
  }
};