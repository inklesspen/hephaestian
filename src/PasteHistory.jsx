import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import styles from './PasteHistory.module.css';

function PasteHistory({ pasted }) {
  return (
    <div>
      <div className={styles.PasteHistoryEntry}>
        <textarea value={pasted} readOnly />
      </div>
    </div>
  );
}

PasteHistory.propTypes = {
  pasted: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({ pasted: state.pastedRichText });

export default connect(mapStateToProps)(PasteHistory);
