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
        <li><button type="button">paste rich text</button></li>
        <li><button type="button">paste html</button></li>
        <li><button type="button">paste markdown</button></li>
        <li><button type="button">upload html file</button></li>
        <li><button type="button">upload markdown file</button></li>
      </ul>
      Hi <button type="button" onClick={() => navigate('/squire')}>Squire</button>
    </div>
  );
}

Welcome.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};
