import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';

class Resource extends Component {
  render() {
    const { id, lockSysSocketId, locker, watchers, isLocked, handleForceLock } = this.props;

    return (
      <Grid>
        <Row>
          <Col md={8}>
            {
              id && <p>resource #{id}</p>
            }
            {
              locker && <p>review by @{locker.username}</p>
            }
            {
              isLocked && <p>LOCKED</p>
            }
          </Col>
          <Col md={4}>
            {
              locker && (
                <div className="locker">
                  <h3>Locked By:</h3>
                  <p>locked by @{locker.username}</p>
                </div>
              )
            }
            {
              watchers && (
                <div className="watchers">
                  <h3>Watchers</h3>
                  <ul>
                    {
                      watchers.map(watcher => (
                        <li>
                          @{watcher.username}
                          {
                            watcher.socketId === lockSysSocketId && (
                              <span>(You)</span>
                            )
                          }
                          {
                            watcher.socketId === lockSysSocketId && (
                              <button className="right" onClick={handleForceLock}>Force Lock</button>
                            )
                          }
                        </li>
                      ))
                    }
                  </ul>
                </div>
              )
            }
          </Col>
        </Row>
      </Grid>
    );
  }
}

Resource.propTypes = {
  id: PropTypes.string,
  lockSysSocketId: PropTypes.string,
  locker: PropTypes.object,
  watchers: PropTypes.array,
  isLocked: PropTypes.bool,
  handleForceLock: PropTypes.func.isRequired,
};

export default Resource;
