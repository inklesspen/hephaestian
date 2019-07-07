// eslint-disable-next-line import/prefer-default-export
export const hephaestianVersionNumber = (
  process.env.NODE_ENV === 'production'
    ? `v${process.env.REACT_APP_VERSION}`
    : `${process.env.NODE_ENV} env`
);
