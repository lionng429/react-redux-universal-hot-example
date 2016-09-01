import { nativeQueues } from './constants';
import {
  DO_LOGIN,
  DO_DISCONNECT,
  FETCH_RESOURCES,
  LEAVE_QUEUE,
  JOIN_QUEUE,
  CREATE_QUEUE,
  LEAVE_RESOURCE,
  JOIN_RESOURCE,
  SKIP_RESOURCE,
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
  const { payload: data = {} } = action;
  const user = Object.assign({}, state.clients.find(client => client.socketId === data.socketId));

  switch (action.type) {
    case DO_LOGIN:
      return {
        ...state,
        clients: !data.socketId ? state.clients : state.clients.concat([{
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
        clients: state.clients.map(client => client.socketId !== user.socketId ? client : Object.assign(user, {
          queueId: state.queues.find(queue => queue.id === data.queueId) ? data.queueId : null,
        })),
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

    case CREATE_QUEUE:
      return {
        ...state,
        queues: state.queues.find(queue => queue.type === data.type && queue.id === data.id) ? state.queues : state.queues.concat([data]),
        resources: state.queues.find(queue => queue.type === data.type && queue.id === data.id) ? state.resources : state.resources.concat(data.resources),
      };

    case FETCH_RESOURCES:
      return {
        ...state,
        queues: state.queues.map(queue => !data.remainingItems.hasOwnProperty(queue.id) ? queue : Object.assign({}, queue, { remainingItems: data.remainingItems[queue.id] })),
        resources: state.resources.concat(data.resources.filter(newResource => newResource.id && !state.resources.find(existingResource => existingResource.id === newResource.id))),
      };

    case JOIN_RESOURCE:
      return {
        ...state,
        clients: state.clients.map(client => client.socketId !== user.socketId ? client : Object.assign(user, {
          resourceId: state.resources.find(resource => resource.id === data.resourceId) ? data.resourceId : null,
        })),
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

    // skipping resource is just to put the resource to the last index
    case SKIP_RESOURCE:
      return {
        ...state,
        resources: state.resources
          .concat(state.resources.filter(resource => resource.queueId === user.queueId && resource.id === user.resourceId))
          .filter((resource, index) => index !== state.resources.findIndex(_resource => _resource.queueId === user.queueId && _resource.id === user.resourceId))
      };

    // resource is marked as processed in each queue
    case MARK_RESOURCE_AS_PROCESSED:
      return {
        ...state,
        processedResources: state.resources.find(resource => resource.id === user.resourceId && resource.queueId === user.queueId) ?
          state.processedResources.concat([{
            queueId: user.queueId,
            resourceId: user.resourceId,
          }]) :
          state.processedResources,
      };

    case DO_DISCONNECT:
      return {
        ...state,
        clients: state.clients.filter(client => client.socketId !== user.socketId),
        queues: !(user && user.queueId) ? state.queues : state.queues.map(queue => queue.id !== user.queueId ? queue : Object.assign({}, queue, {
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