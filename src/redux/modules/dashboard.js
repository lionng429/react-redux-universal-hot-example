export const LOADED_QUEUES = 'LOADED_QUEUES';
export const RESET_DASHBOARD = 'RESET_DASHBOARD';

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

    case RESET_DASHBOARD:
      return initialState;

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

export function resetDashboard() {
  return { type: RESET_DASHBOARD };
}
