import isEmpty from 'lodash/isEmpty';
import React, { Component, PropTypes } from 'react';
import { browserHistory } from 'react-router';
import { connect } from 'react-redux';
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
    numOfPendingItems: state.queue.numOfPendingItems,
    isFetchingResource: state.resource.isFetching,
    resource: state.resource.resource,
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
    const { isFetchingResource, queueId, resource, numOfPendingItems, onResourcePage } = this.props;
    const {
      isFetchingResource: nextIsFetchingResource,
      queueId: nextQueueId,
      resource: nextResource,
      numOfPendingItems: nextNumOfPendingItems,
      onResourcePage: nextOnResourcePage,
    } = nextProps;

    return queueId !== nextQueueId ||
      resource.id !== nextResource.id ||
      numOfPendingItems !== nextNumOfPendingItems ||
      isFetchingResource !== nextIsFetchingResource ||
      onResourcePage !== nextOnResourcePage;
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
      numOfPendingItems,
      isFetchingResource,
      resource,
      onResourcePage,
    } = this.props;

    const noMoreResource = !isFetchingResource && (numOfPendingItems !== null && numOfPendingItems === 0);

    return (
      <Toolbar
        isEmpty={!queueId}
        isFetchingResource={isFetchingResource}
        resource={resource}
        noMoreResource={noMoreResource}
        hasGoToResourceButton={numOfPendingItems !== null && isEmpty(resource) && !noMoreResource && !onResourcePage}
        hasSkipButton={!isEmpty(resource) && !noMoreResource}
        hasMarkAsProcessedButton={!isFetchingResource && !isEmpty(resource)}
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
  isFetchingResource: PropTypes.bool,
  resource: PropTypes.object,
  user: PropTypes.object,
  numOfPendingItems: PropTypes.number,
  onResourcePage: PropTypes.bool,
  resetQueue: PropTypes.func.isRequired,
  selectQueue: PropTypes.func.isRequired,
  updateQueue: PropTypes.func.isRequired,
};
