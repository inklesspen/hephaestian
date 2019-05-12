import React from 'react';
import PropTypes from 'prop-types';

export default function Welcome(props) {
  const navigate = (path) => {
    props.history.push(path);
  };
  let debugPasteButton = null;
  if (process.env.NODE_ENV !== 'production') {
    debugPasteButton = (
      <li><button type="button" onClick={() => navigate('/paste/onpaste')}>paste onPaste html</button></li>
    );
  }
  return (
    <div>
      Choose:
      <ul>
        <li><button type="button" onClick={() => navigate('/paste/richtext')}>paste rich text</button></li>
        <li>paste Markdown (coming soon)</li>
        {debugPasteButton}
      </ul>
    </div>
  );
}

Welcome.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};
