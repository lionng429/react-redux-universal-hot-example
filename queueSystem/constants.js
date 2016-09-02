export const ADD_CLIENT = 'ADD_CLIENT';
export const DO_LOGIN = 'DO_LOGIN';
export const DO_DISCONNECT = 'DO_DISCONNECT';
export const ADD_FETCHED_RESOURCES = 'ADD_FETCHED_RESOURCES';
export const LEAVE_QUEUE = 'LEAVE_QUEUE';
export const JOIN_QUEUE = 'JOIN_QUEUE';
export const CREATE_QUEUE = 'CREATE_QUEUE';
export const LEAVE_RESOURCE = 'LEAVE_RESOURCE';
export const JOIN_RESOURCE = 'JOIN_RESOURCE';
export const SKIP_RESOURCE = 'SKIP_RESOURCE';
export const MARK_RESOURCE_AS_PROCESSED = 'MARK_RESOURCE_AS_PROCESSED';
export const UPDATE_QUEUE_REMAINING_ITEMS = 'UPDATE_QUEUE_REMAINING_ITEMS';

export const nativeQueues = [
  {
    identifier: 'new_reviews',
    type: 'native',
    endPoint: 'reviews/approvalQueue',
  },
  {
    identifier: 'new_comments',
    type: 'native',
    endPoint: 'comments/approvalQueue',
  },
  {
    identifier: 'new_questions',
    type: 'native',
    endPoint: 'questions/approvalQueue',
  },
  {
    identifier: 'new_answers',
    type: 'native',
    endPoint: 'answers/approvalQueue',
  },
];

export const DASHBOARD_CHANNEL = 'dashboard';
export const UPDATE_TIME_INTERVAL = 5 * 1000;
export const EMPTY_RESOURCE = {};
