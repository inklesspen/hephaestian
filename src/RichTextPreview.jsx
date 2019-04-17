import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import unified from 'unified';
import rehypeToReact from 'rehype-react';
import rehypeDomParse from 'rehype-dom-parse';
import styles from './RichTextPreview.module.css';
import Note from './processing/notes';

// eslint-disable-next-line react/prefer-stateless-function
class RichTextPreview extends Component {
  render() {
    const processor = unified()
      .use(rehypeDomParse)
      .use(rehypeToReact, { createElement: React.createElement });
    const result = processor.processSync(this.props.htmlValue).contents;

    const notes = this.props.processingNotes
      .map(noteName => Note.enumValueOf(noteName)).map(note => (
        <li key={note.ordinal}>{note.short}</li>
      ));

    return (
      <React.Fragment>
        <div className={styles.PreviewContainer}>
          {result}
        </div>
        <div>
          <ul>
            {notes}
          </ul>
        </div>
      </React.Fragment>
    );
  }
}

RichTextPreview.propTypes = {
  htmlValue: PropTypes.string.isRequired,
  processingNotes: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
};

const mapState = state => ({ htmlValue: state.htmlValue, processingNotes: state.processingNotes });

export default connect(mapState)(RichTextPreview);
