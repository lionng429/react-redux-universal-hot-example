import React, { Component, PropTypes } from 'react';
import {
  Grid,
  Col,
  Row,
  ControlLabel,
  FormGroup,
  FormControl,
  Alert,
  Pagination,
} from 'react-bootstrap';
import StartProcessButton from '../Dashboard/StartProcessButton';

class Admin extends Component {
  constructor(props) {
    super(props);

    this.handleChangeQueueType = this.handleChangeQueueType.bind(this);
  }

  handleChangeQueueType(evt) {
    this.props.handleChangeQuery('queueType', evt.target.value);
  }

  render() {
    const {
      isFetching,
      createdQueue,
      query,
      page,
      pageRec,
      totalPage,
      totalItems,
      queueName,
      queues,
      resources,
      creationError,
      fetchingError,
      handleCreateQueue,
      handleChangeQueueName,
      handleGoToPage,
      handleSelectQueue,
    } = this.props;

    const itemFrom = (page - 1) * pageRec + 1;
    const itemTo = (page - 1) * pageRec + resources.length;

    return (
      <Grid>
        <Row>
          <Col xs={12} sm={12} md={12} lg={12}>
            <h1>Resource List</h1>
          </Col>
        </Row>
        <Row>
          <Col xs={12} sm={12} md={12} lg={12}>
            <FormGroup controlId="queueId">
              <ControlLabel>Queue ID</ControlLabel>
              <FormControl componentClass="select" defaultValue={query.queueType} onChange={this.handleChangeQueueType}>
                <option value="">Please select a queue</option>
                {
                  queues.map(queueId => <option value={queueId}>{queueId}</option>)
                }
              </FormControl>
            </FormGroup>
          </Col>
        </Row>
        {
          query.queueType && !fetchingError && !isFetching && (
            <Row>
              <Col xs={12} sm={12} md={12} lg={12}>
                Showing {itemFrom} - {itemTo} records out of {totalItems}
              </Col>
            </Row>
          )
        }
        <Row>
          {
            isFetching && (
              <Col xs={12} sm={12} md={12} lg={12}>
                <p>Loading Resource ... Please wait ...</p>
              </Col>
            )
          }
          {
            !isFetching && (
              <Col xs={12} sm={12} md={12} lg={12}>
                {
                  !fetchingError ? (
                    <ul>
                      {
                        resources.map(resource => (
                          <li>
                            Resource#{resource.id}<br />
                            {resource.name}
                          </li>
                        ))
                      }
                    </ul>
                  ) : (
                    <p>Failed to load resources, please try again later.</p>
                  )
                }
              </Col>
            )
          }
        </Row>
        {
          resources.length > 0 && (
            <Row>
              <Col xs={12} sm={12} md={12} lg={12}>
                <Pagination
                  prev
                  next
                  first
                  last
                  ellipsis
                  boundaryLinks
                  items={totalPage}
                  maxButtons={5}
                  activePage={page}
                  onSelect={handleGoToPage}
                />
              </Col>
            </Row>
          )
        }
        {
          query.queueType && !fetchingError && (
            <Row>
              <Col xs={12} sm={12} md={12} lg={12}>
                <h3>Create custom queue</h3>
              </Col>
              {
                creationError && creationError.message && (
                  <Col xs={12} sm={12} md={12} lg={12}>
                    <Alert bsStyle="danger">
                      <h4>Error occurred when creating custom queue!</h4>
                      <p>{creationError.message}. Please try again with another queue name.</p>
                    </Alert>
                  </Col>
                )
              }
              {
                !!createdQueue && (
                  <Col xs={12} sm={12} md={12} lg={12}>
                    <Alert bsStyle="success">
                      <h4>Queue is created successfully.</h4>
                      <p>You can <StartProcessButton queueId={createdQueue.id} handleSelectQueue={handleSelectQueue}>Start Process</StartProcessButton> now</p>
                    </Alert>
                  </Col>
                )
              }
              <Col xs={12} sm={12} md={12} lg={12}>
                <FormGroup controlId="queueName">
                  <ControlLabel>Queue Name</ControlLabel>
                  <FormControl componentClass="input" defaultValue={queueName} onChange={handleChangeQueueName} />
                </FormGroup>
                <button onClick={handleCreateQueue} disabled={!queueName}>Create Queue</button>
              </Col>
            </Row>
          )
        }
      </Grid>
    );
  }
}

Admin.propTypes = {
  isFetching: PropTypes.bool,
  fetchingError: PropTypes.shape({
    status: PropTypes.string,
    message: PropTypes.string,
  }),
  creationError: PropTypes.shape({
    status: PropTypes.string,
    message: PropTypes.string,
  }),
  createdQueue: PropTypes.object,
  queueName: PropTypes.string,
  queues: PropTypes.array,
  query: PropTypes.object,
  page: PropTypes.number,
  pageRec: PropTypes.number,
  totalPage: PropTypes.number,
  totalItems: PropTypes.number,
  resources: PropTypes.array,
  handleCreateQueue: PropTypes.func.isRequired,
  handleChangeQueueName: PropTypes.func.isRequired,
  handleChangeQuery: PropTypes.func.isRequired,
  handleGoToPage: PropTypes.func.isRequired,
  handleSelectQueue: PropTypes.func.isRequired,
};

Admin.defaultProps = {
  queues: [],
  resources: [],
  query: {},
};

export default Admin;
