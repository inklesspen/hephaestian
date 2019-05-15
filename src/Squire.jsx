import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SquireEditor from 'squire-rte';
import DOMPurify from 'dompurify';

import styles from './Squire.module.css';

function extractPastedHtml(handlePastedValue, html, isPaste, editor) {
  // We have no interest in letting Squire actually post-process the pasted HTML.
  // We can do that better on our own.

  // eslint-disable-next-line no-underscore-dangle
  const editorDoc = editor._doc;

  if (!html) {
    return editorDoc.createDocumentFragment();
  }

  if (isPaste) {
    handlePastedValue(html);
  }

  const frag = DOMPurify.sanitize('<div><p></p></div>', {
    ALLOW_UNKNOWN_PROTOCOLS: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: true,
    RETURN_DOM_FRAGMENT: true,
  });
  return editorDoc.importNode(frag, true);
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
      sanitizeToDOMFragment: (...args) => extractPastedHtml(
        this.props.handlePastedValue,
        ...args,
      ),
    });
  }

  componentWillUnmount() {
    this.editor.destroy();
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
  handlePastedValue: PropTypes.func.isRequired,
};

export default connect()(Squire);
