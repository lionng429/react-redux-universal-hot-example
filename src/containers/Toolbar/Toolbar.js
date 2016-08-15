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
} from '../../../queueSystem/events';

@connect(
  state => ({
    user: state.auth.user,
    queueId: state.queue.queueId,
    numOfPendingItems: state.queue.numOfPendingItems,
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
  }

  componentDidMount() {
    const { socket } = global;
    const { updateResource } = this.props;

    socket.on(ASSIGN_RESOURCE, resource => {
      if (resource) {
        updateResource(resource);
        browserHistory.push(`/resources/${resource.type}/${resource.id}`);
      }
    });
  }

  componentDidUpdate(prevProps) {
    const { socket } = global;
    const { user } = this.props;
    const { queueId: prevQueueId } = prevProps;
    const { queueId } = this.props;

    if (prevQueueId !== queueId) {
      if (!!queueId) {
        socket.emit(JOIN_QUEUE, {
          queueId,
          user,
          timestamp: new Date().getTime(),
        });
      }

      if (!!prevQueueId) {
        socket.emit(LEAVE_QUEUE, {
          queueId: prevQueueId,
          user,
          timestamp: new Date().getTime(),
        });
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
    const { user } = this.props;

    socket.emit(GET_NEXT_RESOURCE, {
      user,
      timestamp: new Date().getTime(),
    });
  }

  handleSkipResource() {
    const { socket } = global;
    const { user } = this.props;

    socket.emit(SKIP_RESOURCE, {
      user,
      timestamp: new Date().getTime(),
    });
  }

  render() {
    const {
      queueId,
      numOfPendingItems,
      resource,
      onResourcePage,
    } = this.props;

    const isLastResource = numOfPendingItems === 0;

    return (
      <Toolbar
        isEmpty={!queueId}
        resource={resource}
        hasGoToResourceButton={!onResourcePage}
        hasSkipButton={!isEmpty(resource) && !isLastResource}
        handleGoToResource={this.handleGetNextResource}
        handleLeaveQueue={this.handleLeaveQueue}
        handleSkipResource={this.handleSkipResource}
      />
    );
  }
}

ToolbarContainer.propTypes = {
  queueId: PropTypes.string,
  resource: PropTypes.object,
  user: PropTypes.object,
  numOfPendingItems: PropTypes.number,
  onResourcePage: PropTypes.bool,
  resetQueue: PropTypes.func.isRequired,
  selectQueue: PropTypes.func.isRequired,
  updateResource: PropTypes.func.isRequired,
};
