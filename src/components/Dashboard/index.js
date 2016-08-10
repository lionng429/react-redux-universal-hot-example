import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import {
  Grid, Row, Col
} from 'react-bootstrap';

export default class Dashboard extends Component {
  render() {
    const { queues } = this.props;

    return (
      <Grid>
        <Row>
          <h2>Queues</h2>
          <h3>Natives</h3>
          <Col md={6}>
            <h4>Catalog</h4>

            <ul>
              {Object.values(queues).filter(queue => queue.type === 'native').map((queue, idx) =>
                  <li key={idx}>
                    <strong>{queue.identifier}</strong><br />
                    remaining Items: {queue.remainingItems}<br />
                    processors: <ul>{queue.processors.map((processor, processorIdx) => <li key={processorIdx}><a href={'#' + processor.id}>{processor.name}</a></li>)}</ul>
                    <Link to={`/queue/${queue.identifier}`}>start process</Link>
                  </li>
              )}
            </ul>
          </Col>
          <Col md={6}>
            <h4>Consumer Platform</h4>

            <ul>
              {Object.values(queues).filter(queue => queue.type === 'native').map((queue, idx) =>
                  <li key={idx}>
                    <strong>{queue.identifier}</strong><br />
                    remaining Items: {queue.remainingItems}<br />
                    processors: <ul>{queue.processors.map((processor, processorIdx) => <li key={processorIdx}><a href={'#' + processor.id}>{processor.name}</a></li>)}</ul>
                    <Link to={`/queue/${queue.identifier}`}>start process</Link>
                  </li>
              )}
            </ul>
          </Col>
          <Col md={6}>
            <h3>Customs</h3>
            <ul>
              {Object.values(queues).filter(queue => queue.type === 'native').map((queue, idx) =>
                  <li key={idx}>
                    <strong>{queue.identifier}</strong><br />
                    remaining Items: {queue.remainingItems}<br />
                    processors: <ul>{queue.processors.map((processor, processorIdx) => <li key={processorIdx}><a href={'#' + processor.id}>{processor.name}</a></li>)}</ul>
                    <Link to={`/queue/${queue.identifier}`}>start process</Link>
                  </li>
              )}
            </ul>
          </Col>
          {
            /*
             <hr />
             <h2>Actvities</h2>
             <ul>
             {latestActivities.map((activity, idx) => <li key={idx}>
             {activity.type} by {activity.initiator.name} on {activity.payload.name}
             </li>)}
             </ul>
            */
          }
        </Row>
      </Grid>
    );
  }
}

Dashboard.propTypes = {
  queues: PropTypes.object.isRequired,
};
