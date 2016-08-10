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

    this.handleUpdateResource = this.handleUpdateResource.bind(this);
  }

  componentDidMount() {
    const { socket } = global;

    invariant(
      !!socket,
      'failed to establish websocket connection'
    );

    socket.on(UPDATE_RESOURCE, this.handleUpdateResource);
  }

  componentDidUpdate(prevProps) {
    const { resource: prevResource } = prevProps;
    const { resource, user } = this.props;

    if (prevResource.id !== resource.id) {
      if (prevResource.id) {
        socket.emit(LEAVE_RESOURCE, {
          resource: prevResource,
          user,
        });
      }

      if (resource.id) {
        socket.emit(JOIN_RESOURCE, {
          resource,
          user,
          timestamp: new Date().getTime(),
        });
      }
    }
  }

  componentWillUnmount() {
    const { resource, user } = this.props;

    if (resource) {
      socket.emit(LEAVE_RESOURCE, {
        resource,
        user,
      });
    }

    // clear resource store
    this.handleUpdateResource({});
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
};
