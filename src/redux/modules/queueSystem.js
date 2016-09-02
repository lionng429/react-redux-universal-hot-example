export const CONNECT_QUEUE_SYSTEM = 'CONNECT_QUEUE_SYSTEM';
export const DISCONNECT_QUEUE_SYSTEM = 'DISCONNECT_QUEUE_SYSTEM';
export const initialState = {
  connected: false,
};

export default function queueSystem(state = initialState, action = {}) {
  switch (action.type) {
    case CONNECT_QUEUE_SYSTEM:
      return {
        ...state,
        connected: true,
        socketId: action.payload.socketId,
      };

    case DISCONNECT_QUEUE_SYSTEM:
      return {
        ...state,
        connected: false,
      };

    default:
      return state;
  }
}
