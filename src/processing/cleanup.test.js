import { cleanupRichText } from './cleanup';
import Note from './notes';

function loadTestFixtures(path) {
  /* eslint-disable global-require, import/no-unresolved */
  /* eslint-disable import/no-webpack-loader-syntax, import/no-dynamic-require */
  const before = require(`./testsamples/cleanup/before/${path}.rawhtml`);
  const after = require(`./testsamples/cleanup/after/${path}.rawhtml`);
  /* eslint-enable global-require, import/no-unresolved */
  /* eslint-enable import/no-webpack-loader-syntax, import/no-dynamic-require */
  return { before, after };
}

describe('cocoa text', () => {
  it('weird bisu issue', () => {
    const { before, after } = loadTestFixtures('macos-notes');
    const actual = cleanupRichText(before);
    const expected = {
      html: after,
      notes: [
        Note.DETECTED_MACOS,
        Note.PROCESSED_STYLESHEET, Note.NARROWED_TO_BODY,
        Note.NORMALIZED_FONT_SIZE,
        Note.DETECTED_IRREGULAR_INTER_PARA_SPACING,
      ],
    };
    expect(actual).toEqual(expected);
  });
});

describe('gdocs', () => {
  it('comprehensive check', () => {
    const { before, after } = loadTestFixtures('gdocs-chrome');
    const actual = cleanupRichText(before);
    const expected = {
      html: after,
      notes: [
        Note.DETECTED_GOOGLE_DOCS,
        Note.NORMALIZED_FONT_SIZE,
      ],
    };
    expect(actual).toEqual(expected);
  });
});
