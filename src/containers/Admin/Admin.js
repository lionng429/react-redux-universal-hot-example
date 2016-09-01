import invariant from 'invariant';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import shallowEqual from 'shallowequal';
import queryString from 'query-string';
import Admin from '../../components/Admin/Admin';
import * as adminActions from '../../redux/modules/admin';
import { selectQueue } from '../../redux/modules/queue';
import { nativeQueues } from '../../../queueSystem/constants';
import {
  CREATE_CUSTOM_QUEUE,
  CREATE_CUSTOM_QUEUE_SUCCESS,
  CREATE_CUSTOM_QUEUE_FAIL,
} from '../../../queueSystem/events';

@connect(
  state => ({
    ...state.admin,
  }),
  {
    ...adminActions,
    selectQueue,
  }
)
export default class AdminContainer extends Component {
  constructor(props) {
    super(props);

    this.fetchResources = this.fetchResources.bind(this);
    this.handleChangeQuery = this.handleChangeQuery.bind(this);
    this.handleChangeQueueName = this.handleChangeQueueName.bind(this);
    this.handleCreateQueue = this.handleCreateQueue.bind(this);
    this.handleCreateQueueSuccess = this.handleCreateQueueSuccess.bind(this);
    this.handleCreateQueueFail = this.handleCreateQueueFail.bind(this);
    this.handleGoToPage = this.handleGoToPage.bind(this);
  }

  componentDidMount() {
    const { socket } = global;

    invariant(
      !!socket,
      'failed to establish websocket connection'
    );

    socket.on(CREATE_CUSTOM_QUEUE_SUCCESS, this.handleCreateQueueSuccess);
    socket.on(CREATE_CUSTOM_QUEUE_FAIL, this.handleCreateQueueFail);

    const { params: { type: queueType } } = this.props;

    if (queueType) {
      this.handleChangeQuery('queueType', queueType);
    }
  }

  componentDidUpdate(prevProps) {
    const { query, page, pageRec } = this.props;
    const { query: prevQuery, page: prevPage, pageRec: prevPageRec } = prevProps;

    if (!shallowEqual(prevQuery, query) || page !== prevPage || pageRec !== prevPageRec) {
      this.fetchResources();
    }
  }

  componentWillUnmount() {
    this.props.resetAdmin();
  }

  fetchResources() {
    const { fetchResources, page, pageRec, query: { queueType, ...query } } = this.props;

    if (queueType) {
      fetchResources(queueType, queryString.stringify({
        ...query,
        currentPage: page,
        currentItemCount: pageRec,
      }));
    }
  }

  handleChangeQueueName(evt) {
    this.props.updateQueueName(evt.target.value);
  }

  handleChangeQuery(key, value) {
    if (key) {
      this.props.updateQuery(key, value);
    }
  }

  handleGoToPage(page) {
    this.props.goToPage(page);
  }

  handleCreateQueue() {
    const { socket } = global;
    const { params: { type: queueType }, queueName, query } = this.props;

    socket.emit(CREATE_CUSTOM_QUEUE, {
      type: queueType,
      name: queueName,
      query,
    });
  }

  handleCreateQueueSuccess(createdQueue) {
    this.props.createQueueSuccess(createdQueue);
  }

  handleCreateQueueFail(error) {
    this.props.createQueueFail(error);
  }

  render() {
    const {
      isFetching,
      creationError,
      fetchingError,
      createdQueue,
      query,
      queueName,
      resources,
      page,
      pageRec,
      totalPage,
      totalItems,
      selectQueue: handleSelectQueue,
    } = this.props;

    const queues = nativeQueues
      .filter(queue => queue.type === 'native')
      .reduce((_queues, queue) => {
        _queues.push(queue.identifier);
        return _queues;
      }, []);

    return (
      <div>
        <Helmet title="Resource Search List"/>
        <div className="container">
          <Admin
            isFetching={isFetching}
            fetchingError={fetchingError}
            creationError={creationError}
            createdQueue={createdQueue}
            query={query}
            queueName={queueName}
            queues={queues}
            resources={resources}
            page={page}
            pageRec={pageRec}
            totalPage={totalPage}
            totalItems={totalItems}
            handleChangeQueueName={this.handleChangeQueueName}
            handleChangeQuery={this.handleChangeQuery}
            handleCreateQueue={this.handleCreateQueue}
            handleSelectQueue={handleSelectQueue}
            handleGoToPage={this.handleGoToPage}
          />
        </div>
      </div>
    );
  }
}

AdminContainer.propTypes = {
  params: PropTypes.object,
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
  queues: PropTypes.array,
  resources: PropTypes.array,
  queueName: PropTypes.string,
  query: PropTypes.object,
  page: PropTypes.number,
  pageRec: PropTypes.number,
  totalPage: PropTypes.number,
  totalItems: PropTypes.number,
  createQueueStart: PropTypes.func.isRequired,
  createQueueSuccess: PropTypes.func.isRequired,
  createQueueFail: PropTypes.func.isRequired,
  updateQueueName: PropTypes.func.isRequired,
  updateQuery: PropTypes.func.isRequired,
  fetchResources: PropTypes.func.isRequired,
  resetAdmin: PropTypes.func.isRequired,
  selectQueue: PropTypes.func.isRequired,
  goToPage: PropTypes.func.isRequired,
};
