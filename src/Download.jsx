import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { saveAs } from 'file-saver';

import convertFfnet from './conversion/ffnet';
import convertAo3 from './conversion/ao3';
import convertBbcode from './conversion/bbcode';
import convertMarkdown, { convertForDiscord } from './conversion/markdown';

function downloadHtml(contents) {
  const blob = new Blob([contents], { type: 'text/html;charset=utf-8' });
  saveAs(blob);
}

// eslint-disable-next-line react/prefer-stateless-function
class Download extends Component {
  render() {
    const { htmlValue } = this.props;
    const ffnet = convertFfnet(htmlValue);
    const ao3 = convertAo3(htmlValue);
    const bbcode = convertBbcode(htmlValue);
    const markdown = convertMarkdown(htmlValue);
    const discord = convertForDiscord(htmlValue);
    return (
      <React.Fragment>
        <h2>FFNet</h2>
        <textarea value={ffnet} readOnly rows="20" cols="60" />
        <button type="button" onClick={() => downloadHtml(ffnet)}>Download</button>
        <h2>AO3</h2>
        <textarea value={ao3} readOnly rows="20" cols="60" />
        <button type="button" onClick={() => downloadHtml(ao3)}>Download</button>
        <h2>BBcode</h2>
        <textarea value={bbcode} readOnly rows="20" cols="60" />
        <h2>Markdown</h2>
        <textarea value={markdown} readOnly rows="20" cols="60" />
        <h2>Discord</h2>
        <textarea value={discord} readOnly rows="20" cols="60" />
        <h2>Hephaestian</h2>
        <textarea value={htmlValue} readOnly rows="20" cols="60" />
        <button type="button" onClick={() => downloadHtml(htmlValue)}>Download</button>
      </React.Fragment>
    );
  }
}

Download.propTypes = {
  htmlValue: PropTypes.string.isRequired,
};

const mapState = state => ({ htmlValue: state.htmlValue });

export default connect(mapState)(Download);
