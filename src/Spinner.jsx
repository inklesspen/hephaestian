import React, { Component } from 'react';

import Spinkit from 'react-spinkit';

// eslint-disable-next-line react/prefer-stateless-function
export default class Spinner extends Component {
  render() {
    return (<Spinkit name="ball-grid-pulse" fadeIn="quarter" />);
  }
}
