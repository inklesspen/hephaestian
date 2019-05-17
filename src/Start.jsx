import React, { Component, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import className from 'class-name';
import * as Bluebird from 'bluebird';
import {
  Alert, Collapse, Button, Card, CardBody, CardHeader, Form, Input,
} from 'reactstrap';
import { connect } from 'react-redux';

import { processPastedRichText, processUploadedHephaestianHtml, processMarkdown } from './redux/actions';
import Squire from './Squire';
import styles from './Start.module.css';
import utilStyles from './util.module.css';

function textReaderPromise(file) {
  return new Bluebird((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (e) => { reject(new DOMException(`Error reading ${file.name}: ${e.target.result}`)); };
    reader.onload = (e) => { resolve(e.target.result); };
    reader.readAsText(file);
  });
}

function UploadHandler(props) {
  const { callback } = props;
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length !== 1) return;
    textReaderPromise(acceptedFiles[0]).then((value) => {
      callback(value);
    });
  }, [callback]);
  const {
    getRootProps, getInputProps,
    isDragActive, isDragAccept, isDragReject,
  } = useDropzone({ onDrop, multiple: false });

  const rootClassNames = className([styles.Dropzone, {
    'border-primary': isDragActive,
    'border-success': isDragAccept,
    'border-danger': isDragReject,
  }]);

  return (
    <div {...getRootProps({ className: rootClassNames })}>
      <input {...getInputProps()} />
      {
        isDragActive
          ? <p>Drop the file here&hellip;</p>
          : <p>Drag and drop a file here, or click to select a file.</p>
      }
    </div>
  );
}

UploadHandler.propTypes = {
  callback: PropTypes.func.isRequired,
};

class Start extends Component {
  constructor(props) {
    super(props);
    this.history = props.history;
    this.dispatch = props.dispatch;
    this.state = {
      openCardId: null,
    };
  }

  navigate(path) {
    this.history.push(path);
  }

  handlePastedRichTextValue(pastedHtml) {
    this.dispatch(processPastedRichText(pastedHtml, this.history.push));
  }

  handleUploadedHephaestianHtmlValue(html) {
    this.dispatch(processUploadedHephaestianHtml(html, this.history.push));
  }

  handlePastedMarkdownValue(pastedMarkdown) {
    this.dispatch(processMarkdown(pastedMarkdown, this.history.push));
  }

  makeCard(cardId, cardTitle, cardBodyContents) {
    const { openCardId } = this.state;
    const isOpen = openCardId === cardId;
    const activate = () => { this.setState({ openCardId: cardId }); };
    return (
      <Card key={cardId}>
        <CardHeader className={utilStyles.StretchLinkBoundary}>
          <h5 className="mb-0">
            <Button color="link" onClick={activate} className="stretched-link">{cardTitle}</Button>
          </h5>
        </CardHeader>
        <Collapse isOpen={isOpen}>
          <CardBody>
            {cardBodyContents}
          </CardBody>
        </Collapse>
      </Card>
    );
  }

  render() {
    const cards = [];
    cards.push(this.makeCard(
      'pasteRichText', 'Copy-Paste Rich Text (Google Docs, LibreOffice, etc)',
      (
        <div>
          <div>Copy-paste rich text into this box.</div>
          <Squire handlePastedValue={newHtml => this.handlePastedRichTextValue(newHtml)} />
        </div>
      ),
    ));
    cards.push(this.makeCard(
      'pasteMarkdown', 'Copy-Paste Markdown',
      (
        <Form>
          <Input type="textarea" className="border-dark" onChange={e => this.handlePastedMarkdownValue(e.target.value)} />
        </Form>
      ),
    ));
    cards.push(this.makeCard(
      'uploadMarkdown', 'Upload Markdown file',
      (
        <UploadHandler callback={value => this.handlePastedMarkdownValue(value)} />
      ),
    ));
    cards.push(this.makeCard(
      'uploadHephaestianHtml', 'Upload Hephaestian-produced HTML',
      (
        <div>
          <Alert color="danger">
            Warning: This can only accept HTML files exported by Hephaestian.
            It will reject all other files.
          </Alert>
          <UploadHandler callback={value => this.handleUploadedHephaestianHtmlValue(value)} />
        </div>
      ),
    ));

    if (process.env.NODE_ENV !== 'production') {
      cards.push(this.makeCard(
        'onPaste', 'Paste onPaste HTML',
        (
          <Form>
            <Input type="textarea" className="border-dark" onChange={e => this.handlePastedRichTextValue(e.target.value)} />
          </Form>
        ),
      ));
    }
    return (
      <div>
        <h3 className="pt-3">Where is your text coming from?</h3>
        <hr className="my-2" />
        <div className="accordion">
          {cards}
        </div>
      </div>
    );
  }
}

Start.propTypes = {
  dispatch: PropTypes.func.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

export default connect()(Start);
