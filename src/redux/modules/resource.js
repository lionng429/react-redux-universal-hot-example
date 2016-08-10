const UPDATE_RESOURCE = 'UPDATE_RESOURCE';

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
