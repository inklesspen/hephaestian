import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import {
  Navbar,
  NavbarBrand,
  Container,
} from 'reactstrap';
import Header from './Header';
import Welcome from './Welcome';
import About from './About';
import PasteRichText from './PasteRichText';
import PasteTextbox from './PasteTextbox';
import PasteHistory from './PasteHistory';
import RichTextPreview from './RichTextPreview';
import Download from './Download';
import Spinner from './Spinner';
// import styles from './App.module.css';

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

          <Switch>
            <Route path="/paste/richtext" component={PasteRichText} />
            <Route path="/paste/:format" component={PasteTextbox} />
          </Switch>
          <Route path="/upload/:format" component={Welcome} />

          <Route path="/preview" component={RichTextPreview} />

          <Route path="/download/overview" component={Download} />

          <Route path="/pasteHistory" component={PasteHistory} />
          <Route path="/spinner" component={Spinner} />
        </Container>
      </React.Fragment>
    );
  }
}
