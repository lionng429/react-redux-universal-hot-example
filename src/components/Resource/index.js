import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';

class Resource extends Component {
  render() {
    return (
      <Grid>
        <Row>
          <Col md={8}>
            review by @
          </Col>
          <Col md={4}>
            locked by
          </Col>
        </Row>
      </Grid>
    );
  }
}

Resource.propTypes = {
  isLocked: PropTypes.bool.isRequired,
};

export default Resource;
