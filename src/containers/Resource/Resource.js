import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import Resource from '../../components/Resource';
import * as resourceActions from '../../redux/modules/resource';
import { JOIN_RESOURCE, LEAVE_RESOURCE, MARK_RESOURCE_AS_PROCESSED } from '../../../queueSystem/events';
import {
  ADD_LOCKER_TO_RESOURCE,
  FORCE_LOCK_RESOURCE,
  REMOVE_LOCKER_FROM_RESOURCE,
  UPDATE_RESOURCE_LOCKER,
} from '../../../lockSystem/events';

@connect(
  state => ({
    resource: state.resource.resource,
    connectedLockSystem: state.lockSystem.connected,
    lockSysSocketId: state.lockSystem.socketId,
  }),
  resourceActions
)
export default class ResourceContainer extends Component {
  constructor(props) {
    super(props);

    this.joinResourceChannel = this.joinResourceChannel.bind(this);
    this.leaveResourceChannel = this.leaveResourceChannel.bind(this);
    this.handleUpdateResource = this.handleUpdateResource.bind(this);
    this.markResourceAsProcessed = this.markResourceAsProcessed.bind(this);
  }

  componentDidMount() {
    const { socket, lockSysSocket } = global;

    invariant(
      !!socket,
      'failed to establish websocket connection'
    );

    const { params: { id: resourceId } } = this.props;

    if (resourceId) {
      this.props.fetchResource(resourceId);
    }

    lockSysSocket.on(UPDATE_RESOURCE_LOCKER, this.handleUpdateResource);
  }

  componentDidUpdate(prevProps) {
    const { resource: prevResource, params: { id: prevResourceIdFromParam } } = prevProps;
    const { resource, params: { id: resourceIdFromParam } } = this.props;

    // re-fetch the resource data upon change in resource id param in URL
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

    // remove the event listener to prevent from double firing
    const { lockSysSocket } = global;
    lockSysSocket.off(UPDATE_RESOURCE_LOCKER, this.handleUpdateResource);

    // clear resource store
    resetResource();
  }

  joinResourceChannel(resourceId) {
    const { socket, lockSysSocket } = global;
    socket.emit(JOIN_RESOURCE, { resourceId });
    lockSysSocket.emit(ADD_LOCKER_TO_RESOURCE, { resourceId });
  }

  leaveResourceChannel() {
    const { socket, lockSysSocket } = global;
    socket.emit(LEAVE_RESOURCE);
    lockSysSocket.emit(REMOVE_LOCKER_FROM_RESOURCE);
  }

  markResourceAsProcessed() {
    const { socket } = global;
    socket.emit(MARK_RESOURCE_AS_PROCESSED);
  }

  handleForceLock() {
    const { lockSysSocket } = global;
    lockSysSocket.emit(FORCE_LOCK_RESOURCE);
  }

  handleUpdateResource(resource) {
    const { updateResourceLockerAndWatchers } = this.props;
    updateResourceLockerAndWatchers(resource);
  }

  render() {
    const { resource, connectedLockSystem, lockSysSocketId } = this.props;
    const { locker } = resource;
    return (
      <div>
        <Helmet title="Resource"/>
        <div className="container">
          <Resource
            {...resource}
            lockSysSocketId={lockSysSocketId}
            isLocked={!connectedLockSystem || (locker && locker.socketId !== lockSysSocketId)}
            markResourceAsProcessed={this.markResourceAsProcessed}
            handleForceLock={this.handleForceLock}
          />
        </div>
      </div>
    );
  }
}

ResourceContainer.propTypes = {
  params: PropTypes.object,
  resource: PropTypes.object,
  connectedLockSystem: PropTypes.bool,
  lockSysSocketId: PropTypes.string,
  fetchResource: PropTypes.func.isRequired,
  updateResource: PropTypes.func.isRequired,
  resetResource: PropTypes.func.isRequired,
  updateResourceLockerAndWatchers: PropTypes.func.isRequired,
  markResourceAsProcessed: PropTypes.func.isRequired,
};
