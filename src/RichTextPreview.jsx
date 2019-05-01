import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import unified from 'unified';
import rehypeToReact from 'rehype-react';
import rehypeParse from 'rehype-parse';
import styles from './RichTextPreview.module.css';
import Note from './processing/notes';
import { getBodyContents } from './processing/util';


// eslint-disable-next-line react/prefer-stateless-function
class RichTextPreview extends Component {
  render() {
    const processor = unified()
      .use(rehypeParse)
      .use(rehypeToReact, { createElement: React.createElement });
    const result = processor.stringify(getBodyContents(processor.parse(this.props.htmlValue)));

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
