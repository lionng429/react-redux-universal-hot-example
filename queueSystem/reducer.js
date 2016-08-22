import { nativeQueues } from './constants';
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

export const initialState = {
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

export default function app(state = initialState, action = {}) {
  const { payload: data } = action;
  const user = Object.assign({}, state.clients.find(client => client.socketId === data.socketId));

  switch (action.type) {
    case DO_LOGIN:
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
        queues: state.queues.map(queue => data[queue.id] && Object.assign({}, queue, { remainingItems: data[queue.id].remainingItems })),
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

    case MARK_RESOURCE_AS_PROCESSED:
      return {
        ...state,
        processedResources: state.processedResources.concat([data.resourceId]),
      };

    case DO_DISCONNECT:
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