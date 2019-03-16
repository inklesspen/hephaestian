import React, { Component } from 'react';
import { Route } from 'react-router-dom';
import Header from './Header';
import Welcome from './Welcome';
import Squire from './Squire';
import styles from './App.module.css';

// TODO: resolve this
// eslint-disable-next-line react/prefer-stateless-function
export default class App extends Component {
  render() {
    return (
      <div className={styles.App}>
        <Header />
        <Route exact path="/" component={Welcome} />
        <Route path="/squire" component={Squire} />
      </div>
    );
  }
}
