import React from 'react';
import PropTypes from 'prop-types';

export default function Welcome(props) {
  const navigate = (path) => {
    props.history.push(path);
  };
  return (
    <div>
      Choose:
      <ul>
        <li><button type="button" onClick={() => navigate('/paste/richtext')}>paste rich text</button></li>
        <li><button type="button" onClick={() => navigate('/paste/html')}>paste html</button></li>
        <li><button type="button" onClick={() => navigate('/paste/markdown')}>paste markdown</button></li>
        <li><button type="button" onClick={() => navigate('/upload/html')}>upload html file</button></li>
        <li><button type="button" onClick={() => navigate('/upload/markdown')}>upload markdown file</button></li>
      </ul>
      Hi <button type="button" onClick={() => navigate('/squire')}>Squire</button>
      <button type="button" onClick={() => navigate('/preview')}>Preview</button>
    </div>
  );
}

Welcome.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};
