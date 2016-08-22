const UPDATE_SELECTED_QUEUE = 'UPDATE_SELECTED_QUEUE';
const UPDATE_NUMBER_OF_PENDING_ITEMS = 'UPDATE_NUMBER_OF_PENDING_ITEMS';
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

    case UPDATE_NUMBER_OF_PENDING_ITEMS:
      return {
        ...state,
        numOfPendingItems: state.queueId === action.queueId ? action.numOfPendingItems : state.numOfPendingItems,
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

export function updateNumOfPendingItemsById(queueId, numOfPendingItems) {
  return {
    type: UPDATE_NUMBER_OF_PENDING_ITEMS,
    queueId,
    numOfPendingItems,
  };
}

export function resetQueue() {
  return {
    type: RESET_QUEUE,
  };
}
