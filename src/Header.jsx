import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { connect } from 'react-redux';

import { resetStateAndHistory } from './redux/actions';

function Header(props) {
  return (
    <div>
      <h1>Hi, this is hephaestian</h1>
      <h2>I suck at visual design</h2>
      <div>
        <button type="button" onClick={() => props.history.push('/about')}>About</button>
        <button type="button" onClick={() => props.history.push('/pasteHistory')}>Show Last Pasted Rich Text</button>
        <button type="button" onClick={() => props.dispatch(resetStateAndHistory(props.history))}>Reset</button>
      </div>
    </div>
  );
}

Header.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
  dispatch: PropTypes.func.isRequired,
};

export default withRouter(connect()(Header));
