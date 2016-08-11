// import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { browserHistory } from 'react-router';
import { connect } from 'react-redux';
import {
  Navbar, Nav, NavDropdown, MenuItem, NavItem,
  ButtonToolbar, ButtonGroup,
  Input,
  Button,
  Glyphicon,
  OverlayTrigger,
  Popover,
} from 'react-bootstrap';
import * as queueActions from '../../redux/modules/queue';
import * as resourceActions from '../../redux/modules/resource';
import {
  JOIN_QUEUE,
  LEAVE_QUEUE,
  ASSIGN_RESOURCE,
  GET_LAST_RESOURCE,
  GET_NEXT_RESOURCE,
} from '../../../socket.io/events';

@connect(
  state => ({
    user: state.auth.user,
    queueId: state.queue.queueId,
    resource: state.resource.resource,
  }),
  {
    ...resourceActions,
    ...queueActions
  }
)
export default class ToolbarContainer extends Component {
  constructor(props) {
    super(props);

    this.handleLeaveQueue = this.handleLeaveQueue.bind(this);
    this.handleGetLastResource = this.handleGetLastResource.bind(this);
    this.handleGetNextResource = this.handleGetNextResource.bind(this);
  }

  componentDidMount() {
    const { socket } = global;
    const { updateResource } = this.props;

    socket.on(ASSIGN_RESOURCE, resource => {
      if (resource) {
        updateResource(resource);
        browserHistory.push(`/resources/${resource.type}/${resource.id}`);
      }
    });
  }

  componentDidUpdate(prevProps) {
    const { socket } = global;
    const { user } = this.props;
    const { queueId: prevQueueId } = prevProps;
    const { queueId } = this.props;

    if (prevQueueId !== queueId) {
      if (!!queueId) {
        socket.emit(JOIN_QUEUE, {
          queueId,
          user,
          timestamp: new Date().getTime(),
        });
      }

      if (!!prevQueueId) {
        socket.emit(LEAVE_QUEUE, {
          queueId: prevQueueId,
          user,
          timestamp: new Date().getTime(),
        });
      }
    }
  }

  handleLeaveQueue() {
    const { selectQueue } = this.props;
    selectQueue(null);
  }

  handleGetLastResource() {
    const { socket } = global;
    const { user } = this.props;

    socket.emit(GET_LAST_RESOURCE, {
      user,
      timestamp: new Date().getTime(),
    });
  }

  handleGetNextResource() {
    const { socket } = global;
    const { user } = this.props;

    socket.emit(GET_NEXT_RESOURCE, {
      user,
      timestamp: new Date().getTime(),
    });
  }

  render() {
    const { queueId, resource } = this.props;

    return !!queueId ? (
      <Navbar fixedBottom>
        <Nav>
          <NavDropdown id="current-user-dropdown" eventKey={0} title="@Joris">
            <MenuItem eventKey="1">Settings</MenuItem>
            <MenuItem eventKey="2">Statistics</MenuItem>
          </NavDropdown>
        </Nav>
        <Nav>
          <li className="navbar-form">
            <Input type="text" size={30} placeholder="" buttonAfter={<Button bsStyle="success" type="submit">Search</Button>}/>
          </li>
        </Nav>
        <Nav>
          <NavItem eventKey={7} href="#">
            {
              Object.keys(resource).length > 0 && (
                <OverlayTrigger trigger={['hover', 'focus']} placement="top" overlay={<Popover id="bottom-nav-current-submission" title="Popover top"><strong>Holy guacamole!</strong> Check this info.</Popover>}>
                  <span><Glyphicon glyph="lock" /> Current Review: <strong>{resource.name} @johnny_777</strong></span>
                </OverlayTrigger>
              )
            }
          </NavItem>
        </Nav>
        <Nav pullRight>
          <li className="navbar-form">
            <ButtonToolbar>
              <ButtonGroup>
                <Button bsStyle="link" onClick={this.handleGetLastResource}><Glyphicon glyph="chevron-left" /></Button>
                <Button bsStyle="link">Require Attention</Button>
                <Button bsStyle="link" onClick={this.handleGetNextResource}><Glyphicon glyph="chevron-right" /></Button>
                <Button bsStyle="link" onClick={this.handleLeaveQueue}><Glyphicon glyph="stop" /></Button>
              </ButtonGroup>
            </ButtonToolbar>
          </li>
        </Nav>
      </Navbar>
    ) : (
      <Navbar fixedBottom />
    );
  }
}

ToolbarContainer.propTypes = {
  queueId: PropTypes.string,
  resource: PropTypes.object,
  user: PropTypes.object,
  selectQueue: PropTypes.func.isRequired,
  updateResource: PropTypes.func.isRequired,
};
