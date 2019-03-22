import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { htmlValueChanged } from './redux/actions';

import Squire from './Squire';

class PasteRichText extends Component {
  constructor(props) {
    super(props);
    this.editorRef = React.createRef();
  }
  handleChangedValue(newHtml) {
    this.props.dispatch(htmlValueChanged(newHtml));
  }
  goToNext() {
    this.props.dispatch(); // (resetStateAndHistory(this.props.history))
  }

  render() {
    const enableNextButton = !!this.props.htmlValue;
    return (
      <div>
        <div>
          Paste rich text into this box. Hephaestian will attempt to compensate for fucked up stuff.
        </div>
        <Squire
          ref={this.editorRef}
          htmlValue={this.props.htmlValue}
          onHtmlValueChanged={newHtml => this.handleChangedValue(newHtml)}
        />
        <div>
          <button type="button" disabled={!enableNextButton} onClick={() => this.goToNext()} >Next</button>
        </div>
      </div>
    );
  }
}

PasteRichText.propTypes = {
  dispatch: PropTypes.func.isRequired,
  htmlValue: PropTypes.string,
};

PasteRichText.defaultProps = {
  htmlValue: null,
};

function mapState(state) {
  const active = (state.activeFormat === 'html');
  const htmlValue = active ? state.htmlValue : null;
  return { htmlValue };
}

export default connect(mapState)(PasteRichText);
