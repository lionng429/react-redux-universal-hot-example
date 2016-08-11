import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import Resource from '../../components/Resource';
import * as resourceActions from '../../redux/modules/resource';
import { JOIN_RESOURCE, LEAVE_RESOURCE, UPDATE_RESOURCE } from '../../../socket.io/events';

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

    const { resource } = this.props;
    this.joinResourceChannel(resource);

    socket.on(UPDATE_RESOURCE, this.handleUpdateResource);
  }

  componentDidUpdate(prevProps) {
    const { resource: prevResource } = prevProps;
    const { resource } = this.props;

    if (prevResource.id !== resource.id) {
      if (prevResource.id) {
        this.leaveResourceChannel(prevResource);
      }

      if (resource.id) {
        this.joinResourceChannel(resource);
      }
    }
  }

  componentWillUnmount() {
    const { resource } = this.props;

    if (resource) {
      this.leaveResourceChannel(resource);
    }

    // clear resource store
    this.handleUpdateResource({});
  }

  joinResourceChannel(resource) {
    const { socket } = global;
    const { user } = this.props;

    if (Object.keys(resource).length > 0) {
      socket.emit(JOIN_RESOURCE, {
        resource,
        user,
        timestamp: new Date().getTime(),
      });
    }
  }

  leaveResourceChannel(resource) {
    const { socket } = global;
    const { user } = this.props;

    if (Object.keys(resource).length > 0) {
      socket.emit(LEAVE_RESOURCE, {
        resource,
        user,
        timestamp: new Date().getTime(),
      });
    }
  }

  markAsProcessed() {
    // emit a event to sync the state on ws server
    const { markResourceAsProcessed, resource } = this.props;
    markResourceAsProcessed(resource);
  }

  handleUpdateResource(resource) {
    const { updateResource } = this.props;
    updateResource(resource);
  }

  render() {
    const { resource, user } = this.props;
    const { locker } = resource;

    return (
      <div>
        <Helmet title="Resource"/>
        <div className="container">
          <Resource
            {...resource}
            isLocked={locker && locker.name !== user.name}
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
  updateResource: PropTypes.func.isRequired,
  markResourceAsProcessed: PropTypes.func.isRequired,
};
