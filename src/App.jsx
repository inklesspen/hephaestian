import React, { Component } from 'react';
import { Route } from 'react-router-dom';
import {
  Navbar,
  NavbarBrand,
  Container,
} from 'reactstrap';
import Header from './Header';
import Welcome from './Welcome';
import Start from './Start';
import About from './About';
import PasteHistory from './PasteHistory';
import RichTextPreview from './RichTextPreview';
import Download from './Download';
import Spinner from './Spinner';

// eslint-disable-next-line react/prefer-stateless-function
export default class App extends Component {
  render() {
    return (
      <React.Fragment>
        <Navbar color="primary" dark expand>
          <NavbarBrand tag="span">Hephaestian</NavbarBrand>
          <Header />
        </Navbar>
        <Container>
          <Route exact path="/" component={Welcome} />
          <Route path="/about" component={About} />

          <Route path="/start" component={Start} />

          <Route path="/preview" component={RichTextPreview} />

          <Route path="/download/overview" component={Download} />

          <Route path="/pasteHistory" component={PasteHistory} />
          <Route path="/spinner" component={Spinner} />
        </Container>
      </React.Fragment>
    );
  }
}
