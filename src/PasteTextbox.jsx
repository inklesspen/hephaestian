import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { processPastedRichText } from './redux/actions';

class PasteTextbox extends Component {
  constructor(props) {
    super(props);
    this.editorRef = React.createRef();
  }

  handlePastedValue(pastedHtml) {
    // eslint-disable-next-line react/destructuring-assignment
    this.props.dispatch(processPastedRichText(pastedHtml, this.props.history.push));
  }

  render() {
    return (
      <div>
        <div>
          Paste rich text into this box. Hephaestian will attempt to compensate for fucked up stuff.
        </div>
        <textarea onChange={e => this.handlePastedValue(e.target.value)} />
      </div>
    );
  }
}

PasteTextbox.propTypes = {
  dispatch: PropTypes.func.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

export default connect()(PasteTextbox);
