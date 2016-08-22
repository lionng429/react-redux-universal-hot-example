import {
  DO_LOGIN,
  DO_DISCONNECT,
  FETCH_RESOURCES,
  LEAVE_QUEUE,
  JOIN_QUEUE,
  LEAVE_RESOURCE,
  JOIN_RESOURCE,
  MARK_RESOURCE_AS_PROCESSED,
} from './constants';

export function login(payload) {
  return {
    type: DO_LOGIN,
    payload,
  }
}

export function disconnect(payload) {
  return {
    type: DO_DISCONNECT,
    payload,
  };
}

export function fetchResources(payload) {
  return {
    type: FETCH_RESOURCES,
    payload,
  };
}

export function leaveQueue(payload) {
  return {
    type: LEAVE_QUEUE,
    payload,
  };
}

export function joinQueue(payload) {
  return {
    type: JOIN_QUEUE,
    payload,
  };
}

export function leaveResource(payload) {
  return {
    type: LEAVE_RESOURCE,
    payload,
  };
}

export function joinResource(payload) {
  return {
    type: JOIN_RESOURCE,
    payload,
  };
}

export function markResourceAsProcessed(payload) {
  return {
    type: MARK_RESOURCE_AS_PROCESSED,
    payload,
  };
}