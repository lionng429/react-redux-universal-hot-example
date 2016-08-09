import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import Resource from '../../components/Resource';
import * as resourceActions from '../../redux/modules/dashboard';
import { JOIN_RESOURCE } from '../../../socket.io/events';

@connect(
  state => ({ user: state.auth.user }),
  resourceActions
)
export default class ResourceContainer extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const { socket } = global;

    invariant(
      !!socket,
      'failed to establish websocket connection'
    );

    const { params, user } = this.props;

    socket.emit(JOIN_RESOURCE, {
      resourceId: params.id,
      user,
      timestamp: new Date().getTime(),
    });
  }

  render() {
    return (
      <div>
        <Helmet title="Resource"/>
        <div className="container">
          <Resource />
        </div>
      </div>
    );
  }
}

ResourceContainer.propTypes = {
  params: PropTypes.object,
  user: PropTypes.object,
};
