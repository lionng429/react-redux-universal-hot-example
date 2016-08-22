const UPDATE_SELECTED_QUEUE = 'UPDATE_SELECTED_QUEUE';
const UPDATE_QUEUE = 'UPDATE_QUEUE';
const RESET_QUEUE = 'RESET_QUEUE';

const initialState = {
  queueId: null,
  numOfPendingItems: 0,
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_SELECTED_QUEUE:
      return {
        ...state,
        queueId: action.queueId,
        numOfPendingItems: 0,
      };

    case UPDATE_QUEUE:
      return {
        ...state,
        numOfPendingItems: action.queue.numOfPendingItems,
      };

    case RESET_QUEUE:
      return initialState;

    default:
      return state;
  }
}

export function selectQueue(queueId) {
  return {
    type: UPDATE_SELECTED_QUEUE,
    queueId,
  };
}

export function updateQueue(queue) {
  return {
    type: UPDATE_QUEUE,
    queue,
  };
}

export function resetQueue() {
  return {
    type: RESET_QUEUE,
  };
}
