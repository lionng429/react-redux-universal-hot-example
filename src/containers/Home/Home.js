import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import Dashboard from '../../components/Dashboard';
import * as dashboardActions from '../../redux/modules/dashboard';
import { selectQueue } from '../../redux/modules/queue';
import { JOIN_DASHBOARD, LEAVE_DASHBOARD, REFRESH_QUEUES } from '../../../queueSystem/events';

@connect(
  state => ({
    queueId: state.queue.queueId,
    queues: state.dashboard.queues,
    user: state.auth.user,
  }),
  {
    selectQueue,
    ...dashboardActions,
  }
)
export default class Home extends Component {
  constructor(props) {
    super(props);

    this.handleQueuesLoaded = this.handleQueuesLoaded.bind(this);
  }

  componentDidMount() {
    const { socket } = global;

    invariant(
      !!socket,
      'failed to establish websocket connection'
    );

    socket.emit(JOIN_DASHBOARD);
    socket.on(REFRESH_QUEUES, this.handleQueuesLoaded);
  }

  componentWillUnmount() {
    const { socket } = global;

    socket.emit(LEAVE_DASHBOARD);
    socket.off(REFRESH_QUEUES, this.handleQueuesLoaded);
  }

  handleQueuesLoaded(queues) {
    const { loadedQueues } = this.props;
    loadedQueues(queues);
  }

  render() {
    const { queueId, queues, user, selectQueue: handleSelectQueue } = this.props;
    const styles = require('./Home.scss');

    return (
      <div className={styles.home}>
        <Helmet title="Home"/>
        <div className="container">
          <Dashboard
            currentQueueId={queueId}
            queues={queues}
            user={user}
            handleSelectQueue={handleSelectQueue}
          />
        </div>
      </div>
    );
  }
}

Home.propTypes = {
  queueId: PropTypes.string,
  queues: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  loadedQueues: PropTypes.func.isRequired,
  selectQueue: PropTypes.func.isRequired,
};
