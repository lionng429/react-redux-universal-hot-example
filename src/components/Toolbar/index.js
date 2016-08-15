import React, { Component, PropTypes } from 'react';
import {
  Navbar, Nav, NavDropdown, MenuItem, NavItem,
  ButtonToolbar, ButtonGroup,
  Input,
  Button,
  Glyphicon,
  OverlayTrigger,
  Popover,
} from 'react-bootstrap';

class Toolbar extends Component {
  render() {
    const {
      isEmpty,
      resource,
      hasGoToResourceButton,
      hasSkipButton,
      handleGoToResource,
      handleLeaveQueue,
      handleSkipResource,
    } = this.props;

    return !isEmpty ? (
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
              !!resource.name && (
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
                {
                  hasGoToResourceButton && <Button bsStyle="link" onClick={handleGoToResource}>Go To Resource</Button>
                }
                {
                  hasSkipButton && <Button bsStyle="link" onClick={handleSkipResource}>Skip</Button>
                }
                <Button bsStyle="link" onClick={handleLeaveQueue}><Glyphicon glyph="stop" /></Button>
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

Toolbar.propTypes = {
  isEmpty: PropTypes.bool,
  resource: PropTypes.object,
  hasGoToResourceButton: PropTypes.bool,
  hasSkipButton: PropTypes.bool,
  handleGoToResource: PropTypes.func.isRequired,
  handleLeaveQueue: PropTypes.func.isRequired,
  handleSkipResource: PropTypes.func.isRequired,
};

Toolbar.defaultProps = {
  isEmpty: true,
  resource: {},
  hasGoToResourceButton: false,
  hasSkipButton: false,
};

export default Toolbar;
