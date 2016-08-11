const UPDATE_SELECTED_QUEUE = 'UPDATE_SELECTED_QUEUE';

const initialState = {
  queueId: null,
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_SELECTED_QUEUE:
      return {
        ...state,
        queueId: action.queueId,
      };

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
