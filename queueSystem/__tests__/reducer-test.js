import { expect } from 'chai';
import reducer, { initialState } from '../reducer';
import * as types from '../constants';
import { nativeQueues } from '../constants';

describe('app reducer', () => {
  const existingUser = { socketId: 'a123', id: 1, name: 'existing user', queueId: null, resourceId: null };
  const newUser = { socketId: 'a234', id: 2, name: 'new user' };
  const invalidUser = { id: 2, name: 'invalid user' };
  const queue = nativeQueues[0];
  const newQueue = { identifier: 'new_enquiries', type: 'native' };
  const existingResource = { id: '01234-56789', name: 'existing resource', queueId: queue.identifier, watchers: [] };
  const newResource = { id: '12345-67890', name: 'new resource', watchers: [] };
  const invalidResource = { name: 'invalid resource', watchers: [] };
  const intermediateState = {
    clients: [existingUser],
    queues: nativeQueues.map((queue = {}) => Object.assign({}, {
      type: queue.type,
      id: queue.identifier,
      remainingItems: 0,
      processors: [],
    })),
    resources: [existingResource],
    processedResources: [],
  };

  it('should return the initial state', () => {
    expect(
      reducer(undefined, {})
    ).to.equal(initialState);
  });

  it('should return the injected state', () => {
    expect(
      reducer(intermediateState, {})
    ).to.equal(intermediateState);
  });

  describe('DO_LOGIN', () => {
    it('should append the new user object to state.clients array', () => {
      const initialState = reducer(intermediateState, {});

      const state = reducer(initialState, { type: types.DO_LOGIN, payload: newUser });
      const stateClients = state.clients;
      const loggedInUser = stateClients[(stateClients.length - 1)];

      expect(stateClients).to.have.lengthOf(initialState.clients.length + 1);
      expect(loggedInUser).to.have.property('id', newUser.id);
      expect(loggedInUser).to.have.property('name', newUser.name);
      expect(loggedInUser).to.have.property('queueId', null);
      expect(loggedInUser).to.have.property('resourceId', null);
      expect(loggedInUser).to.have.property('socketId', newUser.socketId);
    });

    it('should not append the new user object with `socketId` property to state.clients array', () => {
      const initialState = reducer(intermediateState, {});

      const state = reducer(intermediateState, { type: types.DO_LOGIN, payload: invalidUser });
      const stateClients = state.clients;

      expect(stateClients).to.have.lengthOf(initialState.clients.length);
    });
  });

  describe('JOIN_QUEUE', () => {
    it('should set the queueId property for the client and append the user to the processors array of the joined queue', () => {
      const initialState = reducer(intermediateState, {});
      const joiningQueue = nativeQueues[0];
      const initialQueue = initialState.queues.find(queue => queue.id === joiningQueue.identifier);

      const state = reducer(initialState, {
        type: types.JOIN_QUEUE,
        payload: {
          socketId: existingUser.socketId,
          queueId: joiningQueue.identifier,
        },
      });

      const stateUser = state.clients[0];
      const joinedQueue = state.queues.find(queue => queue.id === joiningQueue.identifier);
      const newLength = initialQueue.processors.length + 1;

      expect(stateUser).to.have.property('queueId', joiningQueue.identifier);
      expect(joinedQueue.processors).to.be.an('array')
        .that.have.lengthOf(initialQueue.processors.length + 1)
        .that.have.property(`${newLength - 1}`, stateUser);
    });

    it('should take no effect on joining an not existing queue', () => {
      const state = reducer(intermediateState, {
        type: types.JOIN_RESOURCE,
        payload: {
          socketId: existingUser.socketId,
          queueId: newQueue.identifier,
        },
      });

      const stateUser = state.clients.find(client => client.socketId === existingUser.socketId);
      const joinedQueue = state.resources.find(queue => queue.id === newQueue.identifier);
      expect(stateUser).to.have.property('queueId', null);
      expect(joinedQueue).to.be.an('undefined');
    });
  });

  describe('LEAVE_QUEUE', () => {
    let state = reducer(intermediateState, {});
    const joinedQueue = nativeQueues[0];

    beforeEach(() => {
      state = reducer(state, { type: types.JOIN_QUEUE, payload: { socketId: existingUser.socketId, queueId: joinedQueue.identifier }});
    });

    afterEach(() => {
      state = reducer(intermediateState, {});
    });

    it('should set the queueId property for the client to null and remove the user from processors array of the left queue', () => {
      const initialState = state;
      const initialQueue = initialState.queues.find(queue => queue.id === joinedQueue.identifier);

      state = reducer(state, { type: types.LEAVE_QUEUE, payload: { socketId: existingUser.socketId } });

      const stateUser = state.clients[0];
      const leftQueue = state.queues.find(queue => queue.id === joinedQueue.identifier);
      expect(stateUser).to.have.property('queueId', null);
      expect(leftQueue).to.have.property('processors')
        .to.be.an('array')
        .that.have.lengthOf(initialQueue.processors.length - 1);
    });
  });

  describe('JOIN_RESOURCE', () => {
    it('should set the resourceId property for the client and append the user to the watchers array of the joined resource', () => {
      const initialState = reducer(intermediateState, {});
      const initialResource = initialState.resources.find(resource => resource.id === existingResource.id);

      const state = reducer(initialState, {
        type: types.JOIN_RESOURCE,
        payload: {
          socketId: existingUser.socketId,
          resourceId: existingResource.id,
        },
      });

      const stateUser = state.clients.find(client => client.socketId === existingUser.socketId);
      const joinedResource = state.resources.find(resource => resource.id === existingResource.id);
      const newLength = initialResource.watchers.length + 1;

      expect(stateUser).to.have.property('resourceId', joinedResource.id);
      expect(joinedResource).to.have.property('watchers')
        .to.be.an('array')
        .that.have.lengthOf(newLength)
        .that.have.property(`${newLength - 1}`, stateUser);
    });

    it('should take no effect on joining an not existing resource', () => {
      const state = reducer(intermediateState, {
        type: types.JOIN_RESOURCE,
        payload: {
          socketId: existingUser.socketId,
          resourceId: newResource.id,
        },
      });

      const stateUser = state.clients.find(client => client.socketId === existingUser.socketId);
      const joinedResource = state.resources.find(resource => resource.id === newResource.id);
      expect(stateUser).to.have.property('resourceId', null);
      expect(joinedResource).to.be.an('undefined');
    });
  });

  describe('LEAVE_RESOURCE', () => {
    let state = reducer(intermediateState, {});
    const joinedResource = existingResource;

    beforeEach(() => {
      state = reducer(state, { type: types.JOIN_RESOURCE, payload: { socketId: existingUser.socketId, resourceId: existingResource.id }});
    });

    afterEach(() => {
      state = reducer(intermediateState, {});
    });

    it('should set the queueId property for the client to null and remove the user from processors array of the left queue', () => {
      const initialState = state;
      const initialResource = initialState.resources.find(resource => resource.id === joinedResource.id);

      state = reducer(state, { type: types.LEAVE_RESOURCE, payload: { socketId: existingUser.socketId } });

      const stateUser = state.clients[0];
      const leftResource = state.resources.find(resource => resource.id === joinedResource.id);
      expect(stateUser).to.have.property('resourceId', null);
      expect(leftResource).to.have.property('watchers')
        .to.be.an('array')
        .that.have.lengthOf(initialResource.watchers.length - 1);
    });
  });

  describe('MARK_RESOURCE_AS_PROCESSED', () => {
    let state = reducer(intermediateState, {});
    const joinedResource = existingResource;

    beforeEach(() => {
      state = reducer(state, { type: types.JOIN_RESOURCE, payload: { socketId: existingUser.socketId, resourceId: existingResource.id }});
    });

    afterEach(() => {
      state = reducer(intermediateState, {});
    });

    it('should append the resourceId to the array of state.processedResources', () => {
      const initialState = state;
      const initialProcessedResources = initialState.processedResources;

      state = reducer(state, { type: types.MARK_RESOURCE_AS_PROCESSED, payload: { socketId: existingUser.socketId } });

      const stateUser = state.clients[0];
      const newLength = initialProcessedResources.length + 1;

      expect(state.processedResources).to.be.an('array')
        .that.have.lengthOf(newLength)
        .that.have.property(`${newLength - 1}`, stateUser.resourceId);
    });

    it('should not take any resourceId from payload', () => {
      const initialState = state;
      const initialProcessedResources = initialState.processedResources;

      state = reducer(state, { type: types.LEAVE_RESOURCE, payload: { socketId: existingUser.socketId } });
      state = reducer(state, { type: types.MARK_RESOURCE_AS_PROCESSED, payload: { socketId: existingUser.socketId, resourceId: existingResource.id } });

      expect(state.processedResources).to.be.an('array')
        .that.have.lengthOf(initialProcessedResources.length);
    });
  });

  describe('DO_DISCONNECT', () => {
    let state = reducer(intermediateState, {});
    const initialState = state;
    const joiningQueue = nativeQueues[0];
    const joiningResource = existingResource;

    beforeEach(() => {
      state = reducer(state, { type: types.JOIN_QUEUE, payload: { socketId: existingUser.socketId, queueId: joiningQueue.identifier }});
      state = reducer(state, { type: types.JOIN_RESOURCE, payload: { socketId: existingUser.socketId, resourceId: joiningResource.id } });
    });

    afterEach(() => {
      state = reducer(intermediateState, {});
    });

    it('should remove the user from state.clients array', () => {
      state = reducer(state, { type: types.DO_DISCONNECT, payload: { socketId: existingUser.socketId } });

      expect(state.clients).to.be.an('array')
        .that.have.lengthOf(initialState.clients.length - 1);
    });

    it('should remove the user from the processors array of the joined queue', () => {
      const initialState = state;
      const initialQueue = initialState.queues.find(queue => queue.id === initialState.clients[0].queueId);

      state = reducer(state, { type: types.DO_DISCONNECT, payload: { socketId: existingUser.socketId } });
      const leftQueue = state.queues.find(queue => queue.id === initialState.clients[0].queueId);

      expect(leftQueue.processors).to.be.an('array')
        .that.have.lengthOf(initialQueue.processors.length - 1);
    });

    it('should remove the user from the watchers array of the joined resource', () => {
      const initialState = state;
      const initialResource = initialState.resources.find(resource => resource.id === initialState.clients[0].resourceId);

      state = reducer(state, { type: types.DO_DISCONNECT, payload: { socketId: existingUser.socketId } });
      const leftResource = state.resources.find(resource => resource.id === initialState.clients[0].resourceId);

      expect(leftResource.watchers).to.be.an('array')
        .that.have.lengthOf(initialResource.watchers.length - 1);
    });
  });

  describe('FETCH_RESOURCES', () => {
    const initialState = reducer(intermediateState, {});
    let state = initialState;

    const remainingItems = nativeQueues.reduce((data, queue) => {
      data[queue.identifier] = Math.floor(Math.random() * 10);
      return data;
    }, {});

    const data = {
      remainingItems,
      resources: [
        Object.assign({}, existingResource, { queueId: nativeQueues[0].identifier }),
        Object.assign({}, newResource, { queueId: nativeQueues[0].identifier }),
        Object.assign({}, invalidResource, { queueId: nativeQueues[0].identifier }),
      ],
    };

    beforeEach(() => {
      state = reducer(state, { type: types.FETCH_RESOURCES, payload: data })
    });

    afterEach(() => {
      state = reducer(intermediateState, {});
    });

    it('should update the remaining item in every existing queue in state', () => {
      state.queues.forEach(queue => {
        expect(queue).to.have.property('remainingItems', data.remainingItems[queue.id]);
      });
    });

    it('should only append new resource(s) to the state.resources array', () => {
      const queueWithFetchedResources = data.resources
        .filter((resource, index) => data.resources.indexOf(resource) === index)
        .reduce((queueIds, resource) => {
          if (queueIds.findIndex(queueId => queueId === resource.queueId) === -1) {
            queueIds.push(resource.queueId);
          }
          return queueIds;
        }, []);

      queueWithFetchedResources.forEach(queueId => {
        const initialResources = initialState.resources.filter(resource => resource.queueId === queueId);
        const updatedResources = state.resources.filter(resource => resource.queueId === queueId);

        const existingResourceLength = data.resources.filter(newResource => {
          return !!initialResources.find(existingResource => existingResource.id === newResource.id);
        }).length;
        const invalidResourceLength = data.resources.filter(newResource => !newResource.id).length;
        const newResourceLength = data.resources.length - existingResourceLength - invalidResourceLength;

        expect(updatedResources.length).to.equal(initialResources.length + newResourceLength);
      })
    });
  });
});