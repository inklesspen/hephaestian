import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SquireEditor from 'squire-rte';
import DOMPurify from 'dompurify';

import { pasteRichText } from './redux/actions';
import fixhtml from './fixhtml';
import styles from './Squire.module.css';

// eslint-disable-next-line no-unused-vars
function fragToHTML(frag) {
  const myDiv = document.createElement('div');
  myDiv.appendChild(document.importNode(frag, true));
  return myDiv.innerHTML;
}

function sanitizeToDOMFragment(dispatchPastedHTML, html, isPaste, editor) {
  // eslint-disable-next-line no-underscore-dangle
  const editorDoc = editor._doc;

  if (!html) {
    return editorDoc.createDocumentFragment();
  }

  if (isPaste) {
    dispatchPastedHTML(html);
  }

  const fixed = fixhtml(html, editorDoc);

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
    this.dispatchPastedHTML = html => this.props.dispatch(pasteRichText(html));
  }
  componentDidMount() {
    this.editor = new SquireEditor(this.editorRef.current, {
      sanitizeToDOMFragment: (...args) => sanitizeToDOMFragment(this.dispatchPastedHTML, ...args),
    });
    this.editor.addEventListener('willPaste', e => this.handlePaste(e));
  }

  componentWillUnmount() {
    this.editor.destroy();
  }


  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  handlePaste(e) {
    // eslint-disable-next-line no-debugger
    // debugger;
    // const theMarkup = parse5.serialize(myDiv);
    // eslint-disable-next-line no-debugger
    // debugger;
    // eslint-disable-next-line no-console
    // console.log(fragToHTML(e.fragment));
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
  dispatch: PropTypes.func.isRequired,
};


export default connect()(Squire);
