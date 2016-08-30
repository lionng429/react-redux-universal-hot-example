const RESET_RESOURCE = 'RESET_RESOURCE';
const UPDATE_RESOURCE = 'UPDATE_RESOURCE';
const UPDATE_RESOURCE_LOCKER_AND_WATCHERS = 'UPDATE_RESOURCE_LOCKER_AND_WATCHERS';
const UPDATE_LOCKER = 'UPDATE_LOCKER';
const FETCH_RESOURCE_START = 'FETCH_RESOURCE_START';
const FETCH_RESOURCE_SUCCESS = 'FETCH_RESOURCE_SUCCESS';
const FETCH_RESOURCE_FAIL = 'FETCH_RESOURCE_FAIL';

const initialState = {
  isFetching: false,
  resource: {},
  error: {},
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_RESOURCE:
      return {
        ...state,
        resource: action.resource,
      };

    case UPDATE_RESOURCE_LOCKER_AND_WATCHERS:
      return {
        ...state,
        resource: Object.assign({}, state.resource, { locker: action.payload.locker, watchers: action.payload.watchers }),
      };

    case UPDATE_LOCKER:
      return {
        ...state,
        resource: {
          ...state.resource,
          locker: action.locker
        },
      };

    case FETCH_RESOURCE_START:
      return {
        ...state,
        isFetching: true,
      };

    case FETCH_RESOURCE_SUCCESS:
      return {
        ...state,
        isFetching: false,
        resource: Object.assign({}, state.resource, { id: action.result.id, name: action.result.name }),
        error: {},
      };

    case FETCH_RESOURCE_FAIL:
      return {
        ...state,
        isFetching: false,
        resource: {},
        error: action.error,
      };

    case RESET_RESOURCE:
      return initialState;

    default:
      return state;
  }
}

function getFakeResource(resourceId) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        id: resourceId,
        name: `Resource #${resourceId}`,
      });
    }, 1000);
  });
}

export function fetchResource(resourceId) {
  return {
    types: [FETCH_RESOURCE_START, FETCH_RESOURCE_SUCCESS, FETCH_RESOURCE_FAIL],
    promise: () => getFakeResource(resourceId)
  };
}

export function updateResource(resource) {
  return {
    type: UPDATE_RESOURCE,
    resource,
  };
}

export function resetResource() {
  return {
    type: RESET_RESOURCE,
  };
}

export function updateResourceLockerAndWatchers(resource = {}) {
  return {
    type: UPDATE_RESOURCE_LOCKER_AND_WATCHERS,
    payload: {
      locker: resource.locker || {},
      watchers: resource.watchers || [],
    },
  };
}

export function updateLocker(locker) {
  return {
    type: UPDATE_LOCKER,
    locker,
  };
}
