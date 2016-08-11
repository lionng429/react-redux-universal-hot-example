const UPDATE_RESOURCE = 'UPDATE_RESOURCE';
const MARK_RESOURCE_AS_PROCESSED_START = 'MARK_RESOURCE_AS_PROCESSED_START';
const MARK_RESOURCE_AS_PROCESSED_SUCCEEDED = 'MARK_RESOURCE_AS_PROCESSED_SUCCEEDED';
const MARK_RESOURCE_AS_PROCESSED_FAILED = 'MARK_RESOURCE_AS_PROCESSED_FAILED';

const initialState = {
  resource: {},
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_RESOURCE:
      return {
        ...state,
        resource: action.resource,
      };

    default:
      return state;
  }
}

export function updateResource(resource) {
  return {
    type: UPDATE_RESOURCE,
    resource,
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
