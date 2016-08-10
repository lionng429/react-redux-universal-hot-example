import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import { Resource } from '../../containers';
import * as resourceActions from '../../redux/modules/dashboard';
import { JOIN_QUEUE, LEAVE_QUEUE } from '../../../socket.io/events';

@connect(
  state => ({ user: state.auth.user }),
  resourceActions
)
export default class QueueContainer extends Component {
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

    socket.emit(JOIN_QUEUE, {
      queueId: params.queueId,
      user,
      timestamp: new Date().getTime(),
    });
  }

  componentWillUnmount() {
    const { socket } = global;
    const { params, user } = this.props;

    socket.emit(LEAVE_QUEUE, {
      queueId: params.queueId,
      user,
    });
  }

  render() {
    return (
      <div>
        <Helmet title="Queue"/>
        <div className="container">
          <Resource />
        </div>
      </div>
    );
  }
}

QueueContainer.propTypes = {
  params: PropTypes.object,
  user: PropTypes.object,
};
