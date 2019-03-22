import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import unified from 'unified';
import rehypeToReact from 'rehype-react';
import rehypeDomParse from 'rehype-dom-parse';

// eslint-disable-next-line react/prefer-stateless-function
class RichTextPreview extends Component {
  render() {
    const processor = unified()
      .use(rehypeDomParse)
      .use(rehypeToReact, { createElement: React.createElement });
    const result = processor.processSync('<h1>Test</h1>').contents;

    return (
      <div>
        {result}
      </div>
    );
  }
}

export default connect()(RichTextPreview);
