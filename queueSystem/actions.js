import {
  ADD_CLIENT,
  DO_LOGIN,
  DO_DISCONNECT,
  ADD_FETCHED_RESOURCES,
  LEAVE_QUEUE,
  JOIN_QUEUE,
  CREATE_QUEUE,
  LEAVE_RESOURCE,
  JOIN_RESOURCE,
  SKIP_RESOURCE,
  MARK_RESOURCE_AS_PROCESSED,
  UPDATE_QUEUE_REMAINING_ITEMS,
} from './constants';

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

export function disconnect(socketId) {
  return {
    type: DO_DISCONNECT,
    payload: { socketId },
  };
}

export function addFetchedResources(payload) {
  return {
    type: ADD_FETCHED_RESOURCES,
    payload,
  };
}

export function leaveQueue(socketId) {
  return {
    type: LEAVE_QUEUE,
    payload: { socketId },
  };
}

export function joinQueue(socketId, queueId) {
  return {
    type: JOIN_QUEUE,
    payload: { socketId, queueId },
  };
}

export function createQueue(id, resources) {
  return {
    type: CREATE_QUEUE,
    payload: {
      id,
      type: 'custom',
      resources,
      remainingItems: resources.length,
      processors: [],
    },
  };
}

export function leaveResource(socketId) {
  return {
    type: LEAVE_RESOURCE,
    payload: { socketId },
  };
}

export function joinResource(socketId, resourceId) {
  return {
    type: JOIN_RESOURCE,
    payload: { socketId, resourceId },
  };
}

export function skipResource(socketId) {
  return {
    type: SKIP_RESOURCE,
    payload: { socketId },
  };
}

export function markResourceAsProcessed(socketId) {
  return {
    type: MARK_RESOURCE_AS_PROCESSED,
    payload: { socketId },
  };
}

export function updateQueueRemainingItem(queueId, remainingItems) {
  return {
    type: UPDATE_QUEUE_REMAINING_ITEMS,
    payload: { queueId, remainingItems },
  };
}