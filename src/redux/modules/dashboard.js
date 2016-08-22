const LOADED_QUEUES = 'LOADED_QUEUES';

const initialState = {
  queues: [],
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case LOADED_QUEUES:
      return {
        ...state,
        queues: action.queues,
      };

    default:
      return state;
  }
}

export function loadedQueues(queues) {
  return {
    type: LOADED_QUEUES,
    queues,
  };
}
