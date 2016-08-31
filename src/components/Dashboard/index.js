import React, { Component, PropTypes } from 'react';
import StartProcessButton from './StartProcessButton';
import {
  Grid, Row, Col
} from 'react-bootstrap';

export default class Dashboard extends Component {
  constructor(props) {
    super(props);

    this.handleSelectQueue = this.handleSelectQueue.bind(this);
  }

  handleSelectQueue(queueId) {
    const { queues } = this.props;
    const queue = queues.find(_queue => _queue.id === queueId);
    this.props.handleSelectQueue(queueId, queue.type);
  }

  render() {
    const { currentQueueId, queues, user } = this.props;

    return (
      <Grid>
        <Row>
          <h2>Queues</h2>
          <h3>Natives</h3>
          <Col md={6}>
            <h4>Catalog</h4>

            <ul>
              {queues.filter(queue => queue.type === 'native').map((queue, idx) =>
                  <li key={idx}>
                    <strong>{queue.id}</strong><br />
                    remaining Items: {queue.remainingItems}<br />
                    processors: <ul>{queue.processors.map((processor, processorIdx) => <li key={processorIdx}><a href={'#' + processor.id}>{processor.name}</a></li>)}</ul>
                    {
                      (user && currentQueueId !== queue.id) && (
                        <StartProcessButton
                          queueId={queue.id}
                          handleSelectQueue={this.handleSelectQueue}
                        />
                      )
                    }
                  </li>
              )}
            </ul>
          </Col>
          <Col md={6}>
            <h4>Consumer Platform</h4>

            <ul>
              {queues.filter(queue => queue.type === 'native').map((queue, idx) =>
                  <li key={idx}>
                    <strong>{queue.id}</strong><br />
                    remaining Items: {queue.remainingItems}<br />
                    processors: <ul>{queue.processors.map((processor, processorIdx) => <li key={processorIdx}><a href={'#' + processor.id}>{processor.name}</a></li>)}</ul>
                    {
                      (user && currentQueueId !== queue.id) && (
                        <StartProcessButton
                          queueId={queue.id}
                          handleSelectQueue={this.handleSelectQueue}
                        />
                      )
                    }
                  </li>
              )}
            </ul>
          </Col>
          <Col md={6}>
            <h3>Customs</h3>
            <ul>
              {queues.filter(queue => queue.type === 'native').map((queue, idx) =>
                  <li key={idx}>
                    <strong>{queue.id}</strong><br />
                    remaining Items: {queue.remainingItems}<br />
                    processors: <ul>{queue.processors.map((processor, processorIdx) => <li key={processorIdx}><a href={'#' + processor.id}>{processor.name}</a></li>)}</ul>
                    {
                      (user && currentQueueId !== queue.id) && (
                        <StartProcessButton
                          queueId={queue.id}
                          handleSelectQueue={this.handleSelectQueue}
                        />
                      )
                    }
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
  currentQueueId: PropTypes.string,
  queues: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  handleSelectQueue: PropTypes.func.isRequired,
};
