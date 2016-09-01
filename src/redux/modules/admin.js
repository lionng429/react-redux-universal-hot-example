export const UPDATE_QUEUE_NAME = 'UPDATE_QUEUE_NAME';
export const UPDATE_QUERY = 'UPDATE_QUERY';
export const UPDATE_PAGE = 'UPDATE_PAGE';
export const RESET_ADMIN = 'RESET_ADMIN';
export const FETCH_RESOURCES_START = 'FETCH_RESOURCES_START';
export const FETCH_RESOURCES_SUCCESS = 'FETCH_RESOURCES_SUCCESS';
export const FETCH_RESOURCES_FAIL = 'FETCH_RESOURCES_FAIL';
export const CREATE_QUEUE_START = 'CREATE_QUEUE_START';
export const CREATE_QUEUE_SUCCESS = 'CREATE_QUEUE_SUCCESS';
export const CREATE_QUEUE_FAIL = 'CREATE_QUEUE_FAIL';

export const initialState = {
  createdQueue: null,
  queueName: '',
  resources: [],
  query: {},
  page: 1,
  pageRec: 10,
  totalPage: 0,
  totalItems: 0,
  isFetching: false,
  fetchingError: null,
  creationError: null,
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_QUEUE_NAME:
      return {
        ...state,
        queueName: action.payload.queueName,
      };

    case UPDATE_QUERY:
      return {
        ...state,
        createdQueue: initialState.createdQueue,
        queueName: initialState.queueName,
        query: Object.assign({}, state.query, { [action.payload.key]: action.payload.value }),
        page: initialState.page,
        pageRec: initialState.pageRec,
        totalPage: initialState.totalPage,
      };

    case UPDATE_PAGE:
      return {
        ...state,
        page: action.payload.page,
      };

    case CREATE_QUEUE_SUCCESS:
      return {
        ...state,
        createdQueue: action.payload.queue,
        creationError: null,
      };

    case CREATE_QUEUE_FAIL:
      return {
        ...state,
        createdQueue: null,
        creationError: action.payload.error,
      };

    case FETCH_RESOURCES_START:
      return {
        ...state,
        isFetching: true,
        resources: [],
      };

    case FETCH_RESOURCES_SUCCESS:
      return {
        ...state,
        resources: action.result.collection,
        totalPage: action.result.paging.totalPageCount,
        totalItems: action.result.paging.totalItemCount,
        isFetching: false,
        fetchingError: null,
      };

    case FETCH_RESOURCES_FAIL:
      return {
        ...state,
        isFetching: false,
        resources: [],
        fetchingError: action.error,
      };

    case RESET_ADMIN:
      return initialState;

    default:
      return state;
  }
}

export function updateQueueName(queueName) {
  return {
    type: UPDATE_QUEUE_NAME,
    payload: { queueName },
  };
}

export function updateQuery(key, value) {
  return {
    type: UPDATE_QUERY,
    payload: { key, value },
  };
}

export function goToPage(page) {
  return {
    type: UPDATE_PAGE,
    payload: { page },
  };
}

export function fetchResources(queueType, queryString) {
  return {
    types: [FETCH_RESOURCES_START, FETCH_RESOURCES_SUCCESS, FETCH_RESOURCES_FAIL],
    promise: client => client.get(`/admin/${queueType}/search?${queryString}`)
  };
}

export function createQueueSuccess(createdQueue) {
  return {
    type: CREATE_QUEUE_SUCCESS,
    payload: { queue: createdQueue },
  };
}

export function createQueueFail(error) {
  return {
    type: CREATE_QUEUE_FAIL,
    payload: { error },
  };
}

export function resetAdmin() {
  return { type: RESET_ADMIN };
}
