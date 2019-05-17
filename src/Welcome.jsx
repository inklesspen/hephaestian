import React from 'react';
import PropTypes from 'prop-types';
import { Jumbotron, Button } from 'reactstrap';

const hephaestianVersionNumber = process.env.REACT_APP_VERSION;

export default function Welcome(props) {
  const navigate = (path) => {
    props.history.push(path);
  };
  return (
    <div>
      <Jumbotron>
        <h1 className="display-2">Hephaestian {hephaestianVersionNumber}</h1>
        <p className="lead">
          Hephaestian is designed to process fanfic text for posting online.
          It accepts input primarily as copy-pasted rich text, and secondarily as Markdown.
        </p>
        <hr className="my-2" />
        <p>
          Hephaestian is currently in beta. While I expect it to work for most people, please
          double-check that the output matches your expectations, and report any bugs you find.
        </p>
        <p className="lead">
          <Button color="primary" onClick={() => navigate('/start')}>Get Started</Button>
        </p>
      </Jumbotron>
    </div>
  );
}

Welcome.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};
