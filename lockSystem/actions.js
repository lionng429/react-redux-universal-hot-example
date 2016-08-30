import { ADD_LOCKER, REMOVE_LOCKER, FORCE_LOCK, ADD_CLIENT, REMOVE_CLIENT } from './constants';

export function addClient(userData) {
  return {
    type: ADD_CLIENT,
    payload: {
      socketId: userData.socketId,
      username: userData.username,
      resourceId: null,
    },
  };
}

export function removeClient(socketId) {
  return {
    type: REMOVE_CLIENT,
    payload: { socketId },
  };
}

export function addLocker(data) {
  return {
    type: ADD_LOCKER,
    payload: data,
  };
}

export function removeLocker(socketId) {
  return {
    type: REMOVE_LOCKER,
    payload: { socketId },
  };
}

export function forceLock(socketId) {
  return {
    type: FORCE_LOCK,
    payload: { socketId },
  };
}