export const CONNECT_LOCK_SYSTEM = 'CONNECT_LOCK_SYSTEM';
export const DISCONNECT_LOCK_SYSTEM = 'DISCONNECT_LOCK_SYSTEM';
export const initialState = {
  connected: false,
};

export default function lockSystem(state = initialState, action = {}) {
  switch (action.type) {
    case CONNECT_LOCK_SYSTEM:
      return {
        ...state,
        connected: true,
        socketId: action.payload.socketId,
      };

    case DISCONNECT_LOCK_SYSTEM:
      return {
        ...state,
        connected: false,
      };

    default:
      return state;
  }
}
