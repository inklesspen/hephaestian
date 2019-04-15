import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import unified from 'unified';
import rehypeToReact from 'rehype-react';
import rehypeDomParse from 'rehype-dom-parse';
import styles from './RichTextPreview.module.css';

// eslint-disable-next-line react/prefer-stateless-function
class RichTextPreview extends Component {
  render() {
    const processor = unified()
      .use(rehypeDomParse)
      .use(rehypeToReact, { createElement: React.createElement });
    const result = processor.processSync(this.props.htmlValue).contents;

    return (
      <div className={styles.PreviewContainer}>
        {result}
      </div>
    );
  }
}

RichTextPreview.propTypes = {
  htmlValue: PropTypes.string.isRequired,
};

const mapState = state => ({ htmlValue: state.htmlValue });

export default connect(mapState)(RichTextPreview);
