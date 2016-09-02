import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { IndexLink } from 'react-router';
import { LinkContainer } from 'react-router-bootstrap';
import Navbar from 'react-bootstrap/lib/Navbar';
import Nav from 'react-bootstrap/lib/Nav';
import NavItem from 'react-bootstrap/lib/NavItem';
import Helmet from 'react-helmet';
import { isLoaded as isInfoLoaded, load as loadInfo } from 'redux/modules/info';
import { isLoaded as isAuthLoaded, load as loadAuth, logout } from 'redux/modules/auth';
import { push } from 'react-router-redux';
import config from '../../config';
import { asyncConnect } from 'redux-async-connect';
import { Toolbar } from '../index';
import io from 'socket.io-client';
import * as dashboardActions from '../../redux/modules/dashboard';
import { CONNECT_QUEUE_SYSTEM, DISCONNECT_QUEUE_SYSTEM } from '../../redux/modules/queueSystem';
import { CONNECT_LOCK_SYSTEM, DISCONNECT_LOCK_SYSTEM } from '../../redux/modules/lockSystem';

@asyncConnect([{
  promise: ({store: {dispatch, getState}}) => {
    const promises = [];

    if (!isInfoLoaded(getState())) {
      promises.push(dispatch(loadInfo()));
    }
    if (!isAuthLoaded(getState())) {
      promises.push(dispatch(loadAuth()));
    }

    return Promise.all(promises);
  }
}])
@connect(
  state => ({user: state.auth.user}),
  {
    logout,
    pushState: push,
    resetDashboard: dashboardActions.resetDashboard,
  })
export default class App extends Component {
  static propTypes = {
    location: PropTypes.object.isRequired,
    children: PropTypes.object.isRequired,
    user: PropTypes.object,
    logout: PropTypes.func.isRequired,
    pushState: PropTypes.func.isRequired,
    resetDashboard: PropTypes.func.isRequired,
  };

  static contextTypes = {
    store: PropTypes.object.isRequired
  };

  componentWillReceiveProps(nextProps) {
    if (!this.props.user && nextProps.user) {
      // login
      const { user } = nextProps;

      // TODO: see if this could be unify with initSocket in client.js
      // re-establish the socket connection upon login
      global.socket = io('', Object.assign({ path: '/ws/queue', forceNew: true }, user && { query: { username: user.name } }));
      global.socket.on('connect', () => { this.context.store.dispatch({ type: CONNECT_QUEUE_SYSTEM, payload: { socketId: global.lockSysSocket.io.engine.id } }); });
      global.socket.on('disconnect', () => { this.context.store.dispatch({ type: DISCONNECT_QUEUE_SYSTEM }); });

      global.lockSysSocket = io('', Object.assign({ path: '/ws/lock', forceNew: true }, user && { query: { username: user.name } }));
      global.lockSysSocket.on('connect', () => { this.context.store.dispatch({ type: CONNECT_LOCK_SYSTEM, payload: { socketId: global.lockSysSocket.io.engine.id } }); });
      global.lockSysSocket.on('disconnect', () => { this.context.store.dispatch({ type: DISCONNECT_LOCK_SYSTEM }); });

      this.props.pushState('/loginSuccess');
    } else if (this.props.user && !nextProps.user) {
      global.socket.disconnect();
      global.lockSysSocket.disconnect();

      // logout
      this.props.resetDashboard();
      this.props.pushState('/');
    }
  }

  handleLogout = (event) => {
    event.preventDefault();
    this.props.logout();
  };

  render() {
    const { user, location } = this.props;
    const styles = require('./App.scss');
    // TODO: determine if there is a better way to define if a user is on resource page
    const onResourcePage = /^\/resources\/([\w\/$]*)\/([^&\/$]*)/g.test(location.pathname);

    return (
      <div className={styles.app}>
        <Helmet {...config.app.head}/>
        <Navbar fixedTop>
          <Navbar.Header>
            <Navbar.Brand>
              <IndexLink to="/" activeStyle={{color: '#33e0ff'}}>
                <div className={styles.brand}/>
                <span>{config.app.title}</span>
              </IndexLink>
            </Navbar.Brand>
            <Navbar.Toggle/>
          </Navbar.Header>

          <Navbar.Collapse eventKey={0}>
            <Nav navbar>
              {user && <LinkContainer to="/admin">
                <NavItem eventKey={1}>Resource List</NavItem>
              </LinkContainer>}
              {!user &&
              <LinkContainer to="/login">
                <NavItem eventKey={5}>Login</NavItem>
              </LinkContainer>}
              {user &&
              <LinkContainer to="/logout">
                <NavItem eventKey={6} className="logout-link" onClick={this.handleLogout}>
                  Logout
                </NavItem>
              </LinkContainer>}
            </Nav>
            {user &&
            <p className={styles.loggedInMessage + ' navbar-text'}>Logged in as <strong>{user.name}</strong>.</p>}
            <Nav navbar pullRight>
              <NavItem eventKey={1} target="_blank" title="View on Github" href="https://github.com/erikras/react-redux-universal-hot-example">
                <i className="fa fa-github"/>
              </NavItem>
            </Nav>
          </Navbar.Collapse>
        </Navbar>

        <div className={styles.appContent}>
          {this.props.children}
        </div>

        {user && <Toolbar onResourcePage={onResourcePage} />}
      </div>
    );
  }
}
