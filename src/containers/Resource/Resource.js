import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import Resource from '../../components/Resource';
import * as resourceActions from '../../redux/modules/resource';
import { JOIN_RESOURCE, LEAVE_RESOURCE } from '../../../queueSystem/events';
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
    } else if (!resourceIdFromParam) {
      this.props.resetResource();
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

  handleForceLock() {
    const { lockSysSocket } = global;
    lockSysSocket.emit(FORCE_LOCK_RESOURCE);
  }

  handleUpdateResource(resource) {
    const { updateResourceLockerAndWatchers } = this.props;
    updateResourceLockerAndWatchers(resource);
  }

  render() {
    const { params: { id: resourceIdFromParam }, resource, connectedLockSystem, lockSysSocketId } = this.props;
    const { locker } = resource;
    return (
      <div>
        <Helmet title="Resource"/>
        <div className="container">
          {
            !resourceIdFromParam ? (
              <div>
                <p>There is no more pending resources in this queue. Please wait and the system will assign task to you as soon as it is available.</p>
              </div>
            ) : (
              <Resource
                {...resource}
                lockSysSocketId={lockSysSocketId}
                isLocked={!connectedLockSystem || (locker && locker.socketId !== lockSysSocketId)}
                handleForceLock={this.handleForceLock}
              />
            )
          }
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
