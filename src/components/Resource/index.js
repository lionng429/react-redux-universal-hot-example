import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';

class Resource extends Component {
  render() {
    const { id, locker, watchers, isLocked } = this.props;

    return (
      <Grid>
        <Row>
          <Col md={8}>
            {
              id && <p>resource #{id}</p>
            }
            {
              locker && <p>review by @{locker.name}</p>
            }
            {
              isLocked && <p>LOCKED</p>
            }
          </Col>
          <Col md={4}>
            {
              locker && `locked by ${locker.name}`
            }
            {
              watchers && (
                <div>
                  <p>watchers:</p>
                  <ul>
                    {
                      watchers.map(watcher => <li>{watcher.name}</li>)
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
  locker: PropTypes.object,
  watchers: PropTypes.array,
  isLocked: PropTypes.bool,
};

export default Resource;
