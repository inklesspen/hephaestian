import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import Header from './Header';
import Welcome from './Welcome';
import About from './About';
import PasteRichText from './PasteRichText';
import PasteHistory from './PasteHistory';
import RichTextPreview from './RichTextPreview';
import styles from './App.module.css';

// TODO: resolve this
// eslint-disable-next-line react/prefer-stateless-function
export default class App extends Component {
  render() {
    return (
      <div className={styles.App}>
        <Header />
        <Route exact path="/" component={Welcome} />
        <Route path="/about" component={About} />

        <Switch>
          <Route path="/paste/richtext" component={PasteRichText} />
          <Route path="/paste/:format" component={Welcome} />
        </Switch>
        <Route path="/upload/:format" component={Welcome} />

        <Route path="/preview" component={RichTextPreview} />

        <Route path="/bug" component={Welcome} />
        <Route path="/pasteHistory" component={PasteHistory} />
      </div>
    );
  }
}
