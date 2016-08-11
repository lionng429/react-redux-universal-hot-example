import React, { Component, PropTypes } from 'react';

class StartProcessButton extends Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    const { queueId, handleSelectQueue } = this.props;
    handleSelectQueue(queueId);
  }

  render() {
    return (
      <a onClick={this.handleClick}>
        start process
      </a>
    );
  }
}

StartProcessButton.propTypes = {
  queueId: PropTypes.string.isRequired,
  handleSelectQueue: PropTypes.func.isRequired,
};

export default StartProcessButton;
