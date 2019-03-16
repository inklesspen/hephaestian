module.exports = {
  use: [
    '@neutrinojs/airbnb',
    [
      '@neutrinojs/react',
      {
        html: {
          title: 'hephaestian'
        }
      }
    ],
    '@neutrinojs/jest',
    (neutrino) => {
      // access the Neutrino API
      neutrino.config.node.set('Buffer', true);
    },
  ]
};
