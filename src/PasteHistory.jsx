import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import styles from './PasteHistory.module.css';

function PasteHistory(props) {
  const pastes = props.pastes.map(pastedHtml => (
    <div className={styles.PasteHistoryEntry}>
      <textarea value={pastedHtml} readOnly />
    </div>
  ));
  return (
    <div>
      {pastes}
    </div>
  );
}

PasteHistory.propTypes = {
  pastes: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const mapStateToProps = state => ({ pastes: state.pastedRichText });

export default connect(mapStateToProps)(PasteHistory);
