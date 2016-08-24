import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import Resource from '../../components/Resource';
import * as resourceActions from '../../redux/modules/resource';
import { JOIN_RESOURCE, LEAVE_RESOURCE, REFRESH_RESOURCE, MARK_RESOURCE_AS_PROCESSED } from '../../../queueSystem/events';

@connect(
  state => ({
    user: state.auth.user,
    resource: state.resource.resource,
  }),
  resourceActions
)
export default class ResourceContainer extends Component {
  constructor(props) {
    super(props);

    this.joinResourceChannel = this.joinResourceChannel.bind(this);
    this.leaveResourceChannel = this.leaveResourceChannel.bind(this);
    this.handleUpdateResource = this.handleUpdateResource.bind(this);
    this.markAsProcessed = this.markAsProcessed.bind(this);
  }

  componentDidMount() {
    const { socket } = global;

    invariant(
      !!socket,
      'failed to establish websocket connection'
    );

    const { params: { id: resourceId } } = this.props;

    if (resourceId) {
      this.props.fetchResource(resourceId);
    }

    socket.on(REFRESH_RESOURCE, this.handleUpdateResource);
  }

  componentDidUpdate(prevProps) {
    const { resource: prevResource, params: { id: prevResourceIdFromParam } } = prevProps;
    const { resource, params: { id: resourceIdFromParam } } = this.props;

    if (resourceIdFromParam && prevResourceIdFromParam !== resourceIdFromParam) {
      this.props.fetchResource(resourceIdFromParam);
    }

    if (prevResource.id !== resource.id) {
      if (resource.id) {
        // when joining a channel,
        // the server will leave the last channel by default
        this.joinResourceChannel(resource.id);
      } else if (prevResource.id) {
        this.leaveResourceChannel(prevResource.id);
      }
    }
  }

  componentWillUnmount() {
    const { resource, resetResource } = this.props;

    if (Object.keys(resource).length > 0) {
      this.leaveResourceChannel();
    }

    // clear resource store
    resetResource();
  }

  joinResourceChannel(resourceId) {
    const { socket } = global;
    socket.emit(JOIN_RESOURCE, { resourceId });
  }

  leaveResourceChannel() {
    const { socket } = global;
    socket.emit(LEAVE_RESOURCE);
  }

  markAsProcessed() {
    const { socket } = global;
    socket.emit(MARK_RESOURCE_AS_PROCESSED);
  }

  handleUpdateResource(resource) {
    const { updateResourceWatchers } = this.props;
    updateResourceWatchers(resource);
  }

  render() {
    // const { lockSysSocket } = global;
    const { resource, user } = this.props;
    const { locker } = resource;

    return (
      <div>
        <Helmet title="Resource"/>
        <div className="container">
          <Resource
            {...resource}
            isLocked={(locker && locker.socketId !== user.socketId)}
            markResourceAsProcessed={this.markResourceAsProcessed}
          />
        </div>
      </div>
    );
  }
}

ResourceContainer.propTypes = {
  params: PropTypes.object,
  user: PropTypes.object,
  resource: PropTypes.object,
  fetchResource: PropTypes.func.isRequired,
  updateResource: PropTypes.func.isRequired,
  resetResource: PropTypes.func.isRequired,
  updateResourceWatchers: PropTypes.func.isRequired,
  markResourceAsProcessed: PropTypes.func.isRequired,
};
