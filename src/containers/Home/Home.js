import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import Dashboard from '../../components/Dashboard';
import * as dashboardActions from '../../redux/modules/dashboard';
import { DASHBOARD_MOUNTED, QUEUES_LOADED } from '../../../socket.io/events';

@connect(
  state => ({ queues: state.dashboard.queues }),
  dashboardActions
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

    socket.emit(DASHBOARD_MOUNTED);

    // how to prevent from re-declaration upon re-mount?
    socket.on(QUEUES_LOADED, this.handleQueuesLoaded);
  }

  handleQueuesLoaded(queues) {
    const { loadedQueues } = this.props;
    loadedQueues(queues);
  }

  render() {
    const { queues } = this.props;
    const styles = require('./Home.scss');
    return (
      <div className={styles.home}>
        <Helmet title="Home"/>
        <div className="container">
          <Dashboard
            queues={queues}
          />
        </div>
      </div>
    );
  }
}

Home.propTypes = {
  queues: PropTypes.object.isRequired,
  loadedQueues: PropTypes.func.isRequired,
};
