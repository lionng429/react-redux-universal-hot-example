import {
  ADD_CLIENT,
  REMOVE_CLIENT,
  ADD_LOCKER,
  REMOVE_LOCKER,
  FORCE_LOCK,
} from './constants';

export const initialState = {
  clients: [],
  resources: {},
};

export default function app(state = initialState, action = {}) {
  const { payload: data = {} } = action;
  const user = state.clients.find(client => client.socketId === data.socketId);

  switch (action.type) {
    case ADD_CLIENT:
      return {
        ...state,
        clients: state.clients
          .concat([Object.assign({}, data, { resourceId: null })])
          .filter(client => client.socketId && client.username),
      };

    case REMOVE_CLIENT:
      return {
        ...state,
        clients: state.clients.filter(client => client.socketId !== user.socketId),
        resources: {
          ...state.resources,
          [user.resourceId]: Object.assign({}, state.resources[user.resourceId], {
            watchers: (state.resources[user.resourceId] && state.resources[user.resourceId].watchers || [])
              .filter(watcher => watcher.socketId !== user.socketId)
          })
        },
      };

    case ADD_LOCKER:
      return !user ? { ...state } : {
        ...state,
        clients: state.clients.map(client => client.socketId !== user.socketId ? client : Object.assign(user, { resourceId: data.resourceId })),
        resources: {
          ...state.resources,
          [data.resourceId]: Object.assign({}, state.resources[data.resourceId], {
            watchers: (state.resources[data.resourceId] && state.resources[data.resourceId].watchers || [])
              .concat([{
                socketId: user.socketId,
                username: user.username,
                requestTime: data.requestTime,
                forceLock: data.forceLock,
              }])
              .sort((curr, next) => {
                if (curr.forceLock && !next.forceLock) {
                  return -1;
                } else if (!curr.forceLock && next.forceLock) {
                  return 1;
                } else {
                  if (curr.requestTime < next.requestTime) {
                    return -1;
                  }

                  if (curr.requestTime > next.requestTime) {
                    return 1;
                  }

                  return 0;
                }
              })
              .map(watcher => Object.assign({}, watcher, { forceLock: false }))
          }),
        },
      };

    case FORCE_LOCK:
      return !user ? { ...state } : {
        ...state,
        resources: {
          ...state.resources,
          [user.resourceId]: Object.assign({}, state.resources[user.resourceId], {
            watchers: (state.resources[user.resourceId] && state.resources[user.resourceId].watchers || [])
              .filter(watcher => watcher.socketId !== user.socketId)
              .concat([{
                socketId: user.socketId,
                username: user.username,
                requestTime: data.requestTime,
                forceLock: true,
              }])
              .sort((curr, next) => {
                if (curr.forceLock && !next.forceLock) {
                  return -1;
                } else if (!curr.forceLock && next.forceLock) {
                  return 1;
                } else {
                  if (curr.requestTime < next.requestTime) {
                    return -1;
                  }

                  if (curr.requestTime > next.requestTime) {
                    return 1;
                  }

                  return 0;
                }
              })
              .map(watcher => Object.assign({}, watcher, { forceLock: false }))
          }),
        },
      };

    case REMOVE_LOCKER:
      return !user ? { ...state } : {
        ...state,
        clients: state.clients.map(client => client.socketId !== user.socketId ? client : Object.assign({}, user, { resourceId: null })),
        resources: !user.resourceId ? state.resources : {
          ...state.resources,
          [user.resourceId]: Object.assign({}, state.resources[user.resourceId], {
            watchers: (state.resources[user.resourceId] && state.resources[user.resourceId].watchers || [])
              .filter(watcher => watcher.socketId !== user.socketId)
          }),
        },
      };

    default:
      return state;
  }
}