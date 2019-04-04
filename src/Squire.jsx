import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SquireEditor from 'squire-rte';
import DOMPurify from 'dompurify';

import { pasteRichText, conversionNotesChanged } from './redux/actions';
import fixhtml from './processing/fixhtml';
import styles from './Squire.module.css';

function sanitizeToDOMFragment(dispatchPastedHTML, dispatchConversionNotes, html, isPaste, editor) {
  // eslint-disable-next-line no-underscore-dangle
  const editorDoc = editor._doc;

  if (!html) {
    return editorDoc.createDocumentFragment();
  }

  if (isPaste) {
    dispatchPastedHTML(html);
  }

  const fixed = fixhtml(html);

  const frag = DOMPurify.sanitize(fixed, {
    ALLOW_UNKNOWN_PROTOCOLS: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: true,
    RETURN_DOM_FRAGMENT: true,
  });
  const retval = editorDoc.importNode(frag, true);
  return retval;
}

class Squire extends Component {
  constructor(props) {
    super(props);
    this.editorRef = React.createRef();
  }
  componentDidMount() {
    this.editor = new SquireEditor(this.editorRef.current, {
      // safe iff htmlValue only ever contains previously-sanitized HTML,
      // such as from being pasted in.
      isSetHTMLSanitized: false,
      sanitizeToDOMFragment: (...args) => sanitizeToDOMFragment(
        this.props.pasteRichText, this.props.conversionNotesChanged,
        ...args,
      ),
    });
    this.setHtmlIntoEditor();
    this.editor.addEventListener('input', () => this.contentsChanged());
  }

  componentDidUpdate(prevProps) {
    if (this.props.htmlValue !== prevProps.htmlValue) {
      this.setHtmlIntoEditor();
    }
  }

  componentWillUnmount() {
    this.editor.destroy();
  }

  setHtmlIntoEditor() {
    this.editor.setHTML(this.props.htmlValue || '');
  }

  contentsChanged() {
    const newValue = this.editor.getHTML();
    this.props.onHtmlValueChanged(newValue);
  }

  render() {
    return (
      <div className={styles.Squire}>
        <div ref={this.editorRef} className={styles.editor} />
      </div>
    );
  }
}

Squire.propTypes = {
  pasteRichText: PropTypes.func.isRequired,
  conversionNotesChanged: PropTypes.func.isRequired,
  htmlValue: PropTypes.string,
  onHtmlValueChanged: PropTypes.func,
};

Squire.defaultProps = {
  htmlValue: null,
  onHtmlValueChanged: () => {},
};

const actionCreators = {
  pasteRichText,
  conversionNotesChanged,
};

export default connect(null, actionCreators)(Squire);
