import { expect } from 'chai';
import reducer, { initialState } from '../reducer';
import * as types from '../constants';

describe('app reducer', () => {
  const user1 = { socketId: 'socket-id-01', username: 'user1' };
  const user2 = { socketId: 'socket-id-02', username: 'user2' };
  const user3 = { socketId: 'socket-id-03', username: 'user3' };
  const user4 = { socketId: 'socket-id-04', username: 'user4' };
  const userWithoutSocketId = { username: 'userWithoutSocketId' };
  const userWithoutUsername = { socketId: 'socket-id-05' };
  const requestTimeEarly = new Date('2016-08-30 09:00:01').getTime();
  const requestTimeMiddle = new Date('2016-08-30 09:00:02');
  const requestTimeLate = new Date('2016-08-30 09:00:03');

  it('should return the initial state', () => {
    expect(
      reducer(undefined, {})
    ).to.equal(initialState);
  });

  describe('ADD_CLIENT', () => {
    const initialState = reducer(initialState);
    const initialNumOfClients = initialState.clients.length;

    it('should append the incoming client to state.clients array', () => {
      const state = reducer(initialState, { type: types.ADD_CLIENT, payload: user1 });
      const clients = state.clients;
      const numOfClients = clients.length;
      const user = clients[numOfClients - 1];

      expect(clients).to.have.lengthOf(initialNumOfClients + 1);
      expect(clients).to.be.an('array');
      expect(user).to.have.property('socketId', user1.socketId);
      expect(user).to.have.property('username', user1.username);
      expect(user).to.have.property('resourceId', null);
    });

    it('should not append client without socketId to state.clients array', () => {
      const state = reducer(initialState, { type: types.ADD_CLIENT, payload: userWithoutSocketId });
      const clients = state.clients;
      const numOfClients = clients.length;

      expect(clients).to.have.lengthOf(initialNumOfClients);
      expect(clients).to.be.an('array').that.not.have.property(numOfClients - 1);
    });

    it('should not append client without username to state.clients array', () => {
      const state = reducer(initialState, { type: types.ADD_CLIENT, payload: userWithoutUsername });
      const clients = state.clients;
      const numOfClients = clients.length;

      expect(clients).to.have.lengthOf(initialNumOfClients);
      expect(clients).to.be.an('array').that.not.have.property(numOfClients - 1);
    });
  });

  describe('ADD_LOCKER', () => {
    let firstState = reducer(initialState);
    const resourceToJoin = { resourceId: '12345-67890' };

    beforeEach(() => {
      firstState = reducer(firstState, { type: types.ADD_CLIENT, payload: user1 });
      firstState = reducer(firstState, { type: types.ADD_CLIENT, payload: user2 });
      firstState = reducer(firstState, { type: types.ADD_CLIENT, payload: user3 });
      firstState = reducer(firstState, { type: types.ADD_CLIENT, payload: user4 });

    });

    afterEach(() => {
      firstState = reducer(initialState);
    });

    it('should update the resourceId in user object from state.clients array' , () => {
      const state = reducer(firstState, {
        type: types.ADD_LOCKER,
        payload: { socketId: user1.socketId, resourceId: resourceToJoin.resourceId, requestTime: new Date().getTime() },
      });
      const clients = state.clients;
      const user = clients.find(client => client.socketId === user1.socketId);

      expect(user).to.be.an('object').to.have.property('resourceId', resourceToJoin.resourceId);
    });

    it('should append the client to state.resource[resourceId].watchers array, and sort by requestTime ASC', () => {
      const initialNumOfWatchers = firstState.resources[resourceToJoin.resourceId] ? firstState.resources[resourceToJoin.resourceId].watchers.length : 0;
      let state = reducer(firstState, {
        type: types.ADD_LOCKER,
        payload: { socketId: user1.socketId, resourceId: resourceToJoin.resourceId, requestTime: requestTimeLate },
      });
      state = reducer(state, {
        type: types.ADD_LOCKER,
        payload: { socketId: user2.socketId, resourceId: resourceToJoin.resourceId, requestTime: requestTimeMiddle },
      });
      state = reducer(state, {
        type: types.ADD_LOCKER,
        payload: { socketId: user3.socketId, resourceId: resourceToJoin.resourceId, requestTime: requestTimeEarly },
      });
      state = reducer(state, {
        type: types.ADD_LOCKER,
        payload: { socketId: user4.socketId, resourceId: resourceToJoin.resourceId, requestTime: requestTimeMiddle },
      });

      const watchers = state.resources[resourceToJoin.resourceId].watchers;
      const numOfWatchers = watchers.length;
      const locker = watchers[0];

      expect(watchers).to.have.lengthOf(initialNumOfWatchers + 4);

      expect(locker).to.have.property('socketId', user3.socketId);
      expect(locker).to.have.property('username', user3.username);
      expect(locker).to.have.property('requestTime', requestTimeEarly);
      expect(locker).to.have.property('forceLock', false);

      const watcher1 = watchers[1];
      const watcher2 = watchers[2];
      const watcher3 = watchers[3];

      expect(watcher1).to.have.property('socketId', user2.socketId);
      expect(watcher1).to.have.property('username', user2.username);
      expect(watcher1).to.have.property('requestTime', requestTimeMiddle);
      expect(watcher1).to.have.property('forceLock', false);

      expect(watcher2).to.have.property('socketId', user4.socketId);
      expect(watcher2).to.have.property('username', user4.username);
      expect(watcher2).to.have.property('requestTime', requestTimeMiddle);
      expect(watcher2).to.have.property('forceLock', false);

      expect(watcher3).to.have.property('socketId', user1.socketId);
      expect(watcher3).to.have.property('username', user1.username);
      expect(watcher3).to.have.property('requestTime', requestTimeLate);
      expect(watcher3).to.have.property('forceLock', false);
    });
  });

  describe('REMOVE_CLIENT', () => {
    let firstState = reducer(initialState);
    const userToBeRemoved = user1;
    const resourceToLeave = { resourceId: '12345-67890' };

    beforeEach(() => {
      firstState = reducer(firstState, { type: types.ADD_CLIENT, payload: userToBeRemoved });
      firstState = reducer(firstState, { type: types.ADD_LOCKER, payload: { socketId: userToBeRemoved.socketId, resourceId: resourceToLeave.resourceId }});
    });

    afterEach(() => {
      firstState = reducer(initialState);
    });

    it('should remove the client from state.clients array', () => {
      const initialNumOfClients = firstState.clients.length;
      const state = reducer(firstState, { type: types.REMOVE_CLIENT, payload: { socketId: userToBeRemoved.socketId }});
      const clients = state.clients;

      expect(clients).to.have.lengthOf(initialNumOfClients - 1);
    });

    it('should remove the client from state.resource[resourceId].watchers array', () => {
      const initialWatchers = firstState.resources[resourceToLeave.resourceId].watchers;
      const initialNumOfWatchers = initialWatchers.length;
      const state = reducer(firstState, { type: types.REMOVE_CLIENT, payload: { socketId: userToBeRemoved.socketId }});
      const watchers = state.resources[resourceToLeave.resourceId].watchers;

      expect(watchers).to.have.lengthOf(initialNumOfWatchers - 1);
    });
  });
});