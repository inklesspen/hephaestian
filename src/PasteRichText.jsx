import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { processPastedRichText } from './redux/actions';

import Squire from './Squire';

class PasteRichText extends Component {
  handlePastedValue(pastedHtml) {
    // eslint-disable-next-line react/destructuring-assignment
    this.props.dispatch(processPastedRichText(pastedHtml, this.props.history.push));
  }

  goToNext() {
    // eslint-disable-next-line react/destructuring-assignment
    this.props.dispatch(); // (resetStateAndHistory(this.props.history))
  }

  render() {
    return (
      <div>
        <div>
          Paste rich text into this box. Hephaestian will attempt to compensate for fucked up stuff.
        </div>
        <Squire
          handlePastedValue={newHtml => this.handlePastedValue(newHtml)}
        />
      </div>
    );
  }
}

PasteRichText.propTypes = {
  dispatch: PropTypes.func.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

export default connect()(PasteRichText);
