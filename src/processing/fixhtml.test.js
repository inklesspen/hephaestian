import toDiffableHtml from 'diffable-html';

import fixhtml from './fixhtml';
import Note from './notes';

function loadTestFixtures(path) {
  /* eslint-disable global-require, import/no-unresolved */
  /* eslint-disable import/no-webpack-loader-syntax, import/no-dynamic-require */
  const before = require(`./testsamples/fixhtml/before/${path}.rawhtml`);
  const after = require(`./testsamples/fixhtml/after/${path}.rawhtml`);
  /* eslint-enable global-require, import/no-unresolved */
  /* eslint-enable import/no-webpack-loader-syntax, import/no-dynamic-require */
  return { before, after };
}

describe('google docs, macos chrome', () => {
  it('should handle a copy-pasted full doc', () => {
    const { before, after } = loadTestFixtures('gdocs-chrome-mac-entire-doc');
    // these start off like:
    // <meta charset='utf-8'><meta charset="utf-8">
    // <b style="font-weight:normal;" id="docs-internal-guid-854aeed3-7fff-b376-ec26-0b76e18b46f3">
    // remove the meta tags, change the <b> to a <div>
    // also fix any <hr> wrapped in <p>
    const actual = fixhtml(before);
    const expected = {
      html: after,
      notes: [Note.DETECTED_GOOGLE_DOCS],
    };
    expect(toDiffableHtml(actual.html)).toEqual(toDiffableHtml(expected.html));
    expect(actual.notes).toEqual(expect.arrayContaining(expected.notes));
  });
  it('should handle a copy-pasted partial doc', () => {
    const { before, after } = loadTestFixtures('gdocs-chrome-mac-subset');
    // identical to before but ends with <br class="Apple-interchange-newline">
    // which we leave in this stage because because that is legal, just useless
    const actual = fixhtml(before);
    const expected = {
      html: after,
      notes: [Note.DETECTED_GOOGLE_DOCS],
    };
    expect(toDiffableHtml(actual.html)).toEqual(toDiffableHtml(expected.html));
    expect(actual.notes).toEqual(expect.arrayContaining(expected.notes));
  });
  it('should handle <hr> tags inside <p> tags', () => {
    const input = `
    <b style="font-weight:normal;" id="docs-internal-guid-854aeed3-7fff-b376-ec26-0b76e18b46f3">
    <p><span>Lorem ipsum</span><span><br /></span><span><br /></span><hr /></p>
    <p><span>Lorem ipsum</span></p>
    </b>`;
    const actual = fixhtml(input);
    const expected = {
      html: `<div>
      <p><span>Lorem ipsum</span><span><br /></span><span><br /></span></p><hr>
      <p><span>Lorem ipsum</span></p>
      </div>`,
      notes: [Note.DETECTED_GOOGLE_DOCS],
    };
    expect(toDiffableHtml(actual.html)).toEqual(toDiffableHtml(expected.html));
  });
});

describe('libreoffice', () => {
  it('should recognize libreoffice', () => {
    const { before, after } = loadTestFixtures('libreoffice-windows');
    // <meta name="generator" content="LibreOffice 6.2.2.2 (Windows)">
    // <meta name="generator" content="LibreOffice 6.1.0.3 (MacOSX)">
    // haven't spotted any noteworthy platform differences
    const actual = fixhtml(before);
    const expected = {
      // no actual validity fixes necessary, but the parsing and serialization process
      // does convert, eg, <br /> to <br>
      html: after,
      notes: [Note.DETECTED_LIBREOFFICE],
    };
    expect(actual).toEqual(expected);
  });
});

describe('msword', () => {
  it('should recognize msword', () => {
    const { before, after } = loadTestFixtures('msword');
    // <meta name=Generator content="Microsoft Word 12">
    // working from a single sample here tbh
    const actual = fixhtml(before);
    const expected = {
      // Need to remove comments like <!--StartFragment-->
      // also <o:p> tags, which are useless
      html: after,
      notes: [Note.DETECTED_MSWORD],
    };
    expect(actual).toEqual(expected);
  });
});

describe('cocoa text', () => {
  // Scrivener, Byword, and other tools using Cocoa's rich text support
  // all have the same sort of HTML output.
  // <meta name="Generator" content="Cocoa HTML Writer">
  // input contains doctypes that will be stripped
  it('should recognize scrivener', () => {
    const { before, after } = loadTestFixtures('scrivener-macos');
    const actual = fixhtml(before);
    const expected = {
      html: after,
      notes: [Note.DETECTED_MACOS],
    };
    expect(actual).toEqual(expected);
  });
  it('should recognize byword', () => {
    const { before, after } = loadTestFixtures('byword-macos');
    const actual = fixhtml(before);
    const expected = {
      html: after,
      notes: [Note.DETECTED_MACOS],
    };
    expect(actual).toEqual(expected);
  });
});
