import isEmpty from 'lodash/isEmpty';
import React, { Component, PropTypes } from 'react';
import { browserHistory } from 'react-router';
import { connect } from 'react-redux';
import shallowEqual from 'shallowequal';
import * as queueActions from '../../redux/modules/queue';
import * as resourceActions from '../../redux/modules/resource';
import Toolbar from '../../components/Toolbar';
import {
  JOIN_QUEUE,
  LEAVE_QUEUE,
  ASSIGN_RESOURCE,
  SKIP_RESOURCE,
  GET_NEXT_RESOURCE,
  REFRESH_QUEUE,
  MARK_RESOURCE_AS_PROCESSED,
} from '../../../queueSystem/events';

@connect(
  state => ({
    user: state.auth.user,
    queueId: state.queue.queueId,
    queueType: state.queue.queueType,
    numOfPendingItems: state.queue.numOfPendingItems,
    isFetchingResource: state.resource.isFetching,
    resource: state.resource.resource,
    connectedLockSystem: state.lockSystem.connected,
    lockSysSocketId: state.lockSystem.socketId,
  }),
  {
    ...resourceActions,
    ...queueActions,
  }
)
export default class ToolbarContainer extends Component {
  constructor(props) {
    super(props);

    this.handleLeaveQueue = this.handleLeaveQueue.bind(this);
    this.handleGetNextResource = this.handleGetNextResource.bind(this);
    this.handleSkipResource = this.handleSkipResource.bind(this);
    this.handleMarkResourceAsProcessed = this.handleMarkResourceAsProcessed.bind(this);
  }

  componentDidMount() {
    const { socket } = global;

    socket.on(REFRESH_QUEUE, queue => {
      this.handleUpdateQueue(queue);
    });

    socket.on(ASSIGN_RESOURCE, (resource = {}) => {
      if (resource && (resource.type && resource.id)) {
        browserHistory.push(`/resources/${resource.type}/${resource.id}`);
      }
    });
  }

  shouldComponentUpdate(nextProps) {
    const {
      isFetchingResource,
      queueId,
      queueType,
      resource,
      numOfPendingItems,
      onResourcePage,
      connectedLockSystem,
      lockSysSocketId,
    } = this.props;
    const {
      isFetchingResource: nextIsFetchingResource,
      queueId: nextQueueId,
      queueType: nextQueueType,
      resource: nextResource,
      numOfPendingItems: nextNumOfPendingItems,
      onResourcePage: nextOnResourcePage,
      connectedLockSystem: nextConnectedLockSystem,
      lockSysSocketId: nextLockSysSocketId,
    } = nextProps;

    return queueId !== nextQueueId ||
      queueType !== nextQueueType ||
      !shallowEqual(resource, nextResource) ||
      numOfPendingItems !== nextNumOfPendingItems ||
      isFetchingResource !== nextIsFetchingResource ||
      onResourcePage !== nextOnResourcePage ||
      connectedLockSystem !== nextConnectedLockSystem ||
      lockSysSocketId !== nextLockSysSocketId;
  }

  componentDidUpdate(prevProps) {
    const { socket } = global;
    const { queueId: prevQueueId } = prevProps;
    const { queueId } = this.props;

    if (prevQueueId !== queueId) {
      if (queueId) {
        socket.emit(JOIN_QUEUE, {
          queueId,
          timestamp: new Date().getTime(),
        });
      }

      if (prevQueueId && !queueId) {
        socket.emit(LEAVE_QUEUE);
      }
    }
  }

  componentWillUnmount() {
    this.props.resetQueue();
  }

  handleLeaveQueue() {
    const { selectQueue } = this.props;
    selectQueue(null);
  }

  handleGetNextResource() {
    const { socket } = global;

    socket.emit(GET_NEXT_RESOURCE, {
      timestamp: new Date().getTime(),
    });
  }

  handleUpdateQueue(queue) {
    const { queueId, updateQueue } = this.props;

    if (queue.id === queueId) {
      updateQueue(queue);
    }
  }

  handleSkipResource() {
    const { socket } = global;
    socket.emit(SKIP_RESOURCE);
  }

  handleMarkResourceAsProcessed() {
    const { socket } = global;
    socket.emit(MARK_RESOURCE_AS_PROCESSED);
  }

  render() {
    const {
      queueId,
      queueType,
      numOfPendingItems,
      isFetchingResource,
      resource,
      onResourcePage,
      connectedLockSystem,
      lockSysSocketId,
    } = this.props;

    const isNativeQueue = queueType === 'native';
    const isLocker = connectedLockSystem && (resource.locker && resource.locker.socketId === lockSysSocketId);
    const noMoreResource = !isFetchingResource && (numOfPendingItems !== null && numOfPendingItems === 0);

    return (
      <Toolbar
        isEmpty={!queueId}
        isFetchingResource={isFetchingResource}
        resource={resource}
        noMoreResource={noMoreResource}
        hasGoToResourceButton={numOfPendingItems !== null && isEmpty(resource) && !noMoreResource && !onResourcePage}
        hasRequireAttentionButton={!isFetchingResource && !isEmpty(resource) && isNativeQueue && isLocker}
        hasSkipButton={!isEmpty(resource) && !noMoreResource && !isNativeQueue}
        hasMarkAsProcessedButton={!isFetchingResource && !isEmpty(resource) && isLocker && !!queueId}
        handleGoToResource={this.handleGetNextResource}
        handleLeaveQueue={this.handleLeaveQueue}
        handleSkipResource={this.handleSkipResource}
        handleMarkResourceAsProcessed={this.handleMarkResourceAsProcessed}
      />
    );
  }
}

ToolbarContainer.propTypes = {
  queueId: PropTypes.string,
  queueType: PropTypes.oneOf(['native', 'custom']),
  isFetchingResource: PropTypes.bool,
  resource: PropTypes.object,
  user: PropTypes.object,
  numOfPendingItems: PropTypes.number,
  onResourcePage: PropTypes.bool,
  connectedLockSystem: PropTypes.bool,
  lockSysSocketId: PropTypes.string,
  resetQueue: PropTypes.func.isRequired,
  selectQueue: PropTypes.func.isRequired,
  updateQueue: PropTypes.func.isRequired,
};
