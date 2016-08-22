import { expect } from 'chai';
import reducer, { initialState } from '../reducer';
import * as types from '../constants';
import { nativeQueues } from '../constants';

describe('app reducer', () => {
  const newUser = { socketId: 'a123', id: 1, name: 'user' };
  const newUser2 = { socketId: 'b234', id: 2, name: 'user2' };
  const queue = nativeQueues[0];
  const resource = { id: '12345-67890' };

  it('should return the initial state', () => {
    expect(
      reducer(undefined, {})
    ).to.equal(initialState)
  });

  it('should handle DO_LOGIN', () => {
    let state = reducer(initialState, { type: types.DO_LOGIN, payload: newUser });
    let clients = state.clients;
    let user = clients[0];

    expect(clients).to.have.lengthOf(1);
    expect(user).to.have.property('id', newUser.id);
    expect(user).to.have.property('name', newUser.name);
    expect(user).to.have.property('queueId', null);
    expect(user).to.have.property('resourceId', null);
    expect(user).to.have.property('socketId', newUser.socketId);

    state = reducer(state, { type: types.DO_LOGIN, payload: newUser2 });
    clients = state.clients;
    user = clients[0];
    let user2 = clients[1];

    expect(clients).to.have.lengthOf(2);

    expect(user).to.have.property('id', newUser.id);
    expect(user).to.have.property('name', newUser.name);
    expect(user).to.have.property('queueId', null);
    expect(user).to.have.property('resourceId', null);
    expect(user).to.have.property('socketId', newUser.socketId);

    expect(user2).to.have.property('id', newUser2.id);
    expect(user2).to.have.property('name', newUser2.name);
    expect(user2).to.have.property('queueId', null);
    expect(user2).to.have.property('resourceId', null);
    expect(user2).to.have.property('socketId', newUser2.socketId);
  });

  it('should handle JOIN_QUEUE', () => {
    let state = reducer(initialState, { type: types.DO_LOGIN, payload: newUser });
    state = reducer(state, { type: types.JOIN_QUEUE, payload: { socketId: newUser.socketId ,queueId: queue.identifier } });

    const user = state.clients[0];
    expect(user).to.have.property('queueId', queue.identifier);
  });

  it('should handle LEAVE_QUEUE', () => {
    let state = reducer(initialState, { type: types.DO_LOGIN, payload: newUser });
    let user = state.clients[0];

    state = reducer(state, { type: types.JOIN_QUEUE, payload: { socketId: user.socketId ,queueId: queue.identifier } });
    user = state.clients[0];
    expect(user).to.have.property('queueId', queue.identifier);

    state = reducer(state, { type: types.LEAVE_QUEUE, payload: { socketId: user.socketId }});
    user = state.clients[0];
    expect(user).to.have.property('queueId', null);
  });
});