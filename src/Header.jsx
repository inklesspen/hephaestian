import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { connect } from 'react-redux';
import { Button } from 'reactstrap';

import { resetStateAndHistory } from './redux/actions';

function Header(props) {
  return (
    <div>
      <Button color="info" onClick={() => props.history.push('/about')}>About</Button>
      <Button color="warning" onClick={() => props.history.push('/pasteHistory')}>Show Last Pasted Rich Text</Button>
      <Button color="danger" onClick={() => props.dispatch(resetStateAndHistory(props.history))}>Reset</Button>
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
