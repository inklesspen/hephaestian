import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { saveAs } from 'file-saver';
import {
  Alert, Collapse, Button, Card, CardBody, CardHeader, Form, Input,
} from 'reactstrap';

import convertFfnet from './conversion/ffnet';
import convertAo3 from './conversion/ao3';
import convertBbcode from './conversion/bbcode';
import convertMarkdown, { convertForDiscord } from './conversion/markdown';
import utilStyles from './util.module.css';

function downloadHtml(contents) {
  const blob = new Blob([contents], { type: 'text/html;charset=utf-8' });
  saveAs(blob);
}

class Download extends Component {
  constructor(props) {
    super(props);
    this.state = {
      openCardId: null,
    };
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
    const { htmlValue } = this.props;
    const ffnet = convertFfnet(htmlValue);
    const ao3 = convertAo3(htmlValue);
    const bbcode = convertBbcode(htmlValue);
    const markdown = convertMarkdown(htmlValue);
    const discord = convertForDiscord(htmlValue);
    const cards = [];
    cards.push(this.makeCard(
      'ffnet', 'HTML for Fanfiction.Net',
      (
        <div>
          <button type="button" onClick={() => downloadHtml(ffnet)}>Download</button>
        </div>
      ),
    ));
    cards.push(this.makeCard(
      'ao3', 'HTML for AO3',
      (
        <Form>
          <Input type="textarea" className="border-dark" readOnly value={ao3} rows="20" />
        </Form>
      ),
    ));
    cards.push(this.makeCard(
      'bbcode', 'BBcode',
      (
        <Form>
          <Input type="textarea" className="border-dark" readOnly value={bbcode} rows="20" />
        </Form>
      ),
    ));
    cards.push(this.makeCard(
      'markdown', 'Markdown',
      (
        <Form>
          <Input type="textarea" className="border-dark" readOnly value={markdown} rows="20" />
        </Form>
      ),
    ));
    cards.push(this.makeCard(
      'discord', 'Discord Code Blocks',
      (
        <Form>
          <Input type="textarea" className="border-dark" readOnly value={discord} rows="20" />
        </Form>
      ),
    ));
    cards.push(this.makeCard(
      'hephaestian', 'HTML for Hephaestian',
      (
        <div>
          <Alert color="info">
            You can upload this file into Hephaestian to get back to this download page.
          </Alert>
          <button type="button" onClick={() => downloadHtml(htmlValue)}>Download</button>
        </div>
      ),
    ));

    return (
      <div className="accordion">
        {cards}
      </div>
    );
  }
}

Download.propTypes = {
  htmlValue: PropTypes.string.isRequired,
};

const mapState = state => ({ htmlValue: state.htmlValue });

export default connect(mapState)(Download);
