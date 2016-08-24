const RESET_RESOURCE = 'RESET_RESOURCE';
const UPDATE_RESOURCE = 'UPDATE_RESOURCE';
const UPDATE_RESOURCE_WATCHERS = 'UPDATE_RESOURCE_WATCHERS';
const UPDATE_LOCKER = 'UPDATE_LOCKER';
const FETCH_RESOURCE_START = 'FETCH_RESOURCE_START';
const FETCH_RESOURCE_SUCCESS = 'FETCH_RESOURCE_SUCCESS';
const FETCH_RESOURCE_FAIL = 'FETCH_RESOURCE_FAIL';
const MARK_RESOURCE_AS_PROCESSED_START = 'MARK_RESOURCE_AS_PROCESSED_START';
const MARK_RESOURCE_AS_PROCESSED_SUCCEEDED = 'MARK_RESOURCE_AS_PROCESSED_SUCCEEDED';
const MARK_RESOURCE_AS_PROCESSED_FAILED = 'MARK_RESOURCE_AS_PROCESSED_FAILED';

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

    case UPDATE_RESOURCE_WATCHERS:
      return {
        ...state,
        resource: action.watchers ? Object.assign({}, state.resource, { watchers: action.watchers }) : state.resource,
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
        resource: action.result,
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

export function updateResourceWatchers(resource) {
  return {
    type: UPDATE_RESOURCE_WATCHERS,
    watchers: resource.watchers,
  };
}

export function updateLocker(locker) {
  return {
    type: UPDATE_LOCKER,
    locker,
  };
}

export function markResourceAsProcessed(resource) {
  return {
    types: [
      MARK_RESOURCE_AS_PROCESSED_START,
      MARK_RESOURCE_AS_PROCESSED_SUCCEEDED,
      MARK_RESOURCE_AS_PROCESSED_FAILED
    ],
    resource,
  };
}
