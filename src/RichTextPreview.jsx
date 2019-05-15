import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import unified from 'unified';
import rehypeToReact from 'rehype-react';
import rehypeParse from 'rehype-parse';
import styles from './RichTextPreview.module.css';
import Note from './processing/notes';
import { getBodyContents } from './processing/util';

const processor = unified()
  .use(rehypeParse)
  .use(rehypeToReact, { createElement: React.createElement });

// eslint-disable-next-line react/prefer-stateless-function
class RichTextPreview extends Component {
  render() {
    const { history, htmlValue, processingNotes } = this.props;
    const navigate = (path) => {
      history.push(path);
    };

    const result = processor.stringify(getBodyContents(processor.parse(htmlValue)));

    const notes = processingNotes
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
        <button type="button" onClick={() => navigate('/download/overview')}>Looks good</button>
      </React.Fragment>
    );
  }
}

RichTextPreview.propTypes = {
  htmlValue: PropTypes.string.isRequired,
  processingNotes: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

const mapState = state => ({ htmlValue: state.htmlValue, processingNotes: state.processingNotes });

export default connect(mapState)(RichTextPreview);
