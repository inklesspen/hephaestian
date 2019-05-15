import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { MemoryRouter as Router } from 'react-router-dom';
import App from './App';
import store from './redux/store';
import './index.css';

const root = document.getElementById('root');
const load = () => render(
  (
      <Provider store={store}>
        <Router>
          <App />
        </Router>
      </Provider>
  ), root,
);

load();
