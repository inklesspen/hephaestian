import toDiffableHtml from 'diffable-html';

import fixhtml from '../../src/processing/fixhtml';
import Note from '../../src/processing/notes';

import * as inputsamples from './htmlsamples';
import * as outputsamples from './processedsamples';

describe('google docs, macos chrome', () => {
  it('should handle a copy-pasted full doc', () => {
    // these start off like:
    // <meta charset='utf-8'><meta charset="utf-8">
    // <b style="font-weight:normal;" id="docs-internal-guid-854aeed3-7fff-b376-ec26-0b76e18b46f3">
    // remove the meta tags, change the <b> to a <div>
    // also fix any <hr> wrapped in <p>
    const actual = fixhtml(inputsamples.gdocsChromeMacEntireDoc);
    const expected = {
      html: outputsamples.gdocsChromeMacEntireDoc,
      notes: [Note.DETECTED_GOOGLE_DOCS],
    };
    expect(toDiffableHtml(actual.html)).toEqual(toDiffableHtml(expected.html));
    expect(actual.notes).toEqual(expect.arrayContaining(expected.notes));
  });
  it('should handle a copy-pasted partial doc', () => {
    // identical to before but ends with <br class="Apple-interchange-newline">
    // which we leave in this stage because because that is legal, just useless
    const actual = fixhtml(inputsamples.gdocsChromeMacSubset);
    const expected = {
      html: outputsamples.gdocsChromeMacSubset,
      notes: [Note.DETECTED_GOOGLE_DOCS],
    };
    expect(toDiffableHtml(actual.html)).toEqual(toDiffableHtml(expected.html));
    expect(actual.notes).toEqual(expect.arrayContaining(expected.notes));
  });
});

describe('libreoffice', () => {
  it('should recognize libreoffice', () => {
    // <meta name="generator" content="LibreOffice 6.2.2.2 (Windows)">
    // <meta name="generator" content="LibreOffice 6.1.0.3 (MacOSX)">
    // haven't spotted any noteworthy platform differences
    const actual = fixhtml(inputsamples.libreOfficeWindows);
    const expected = {
      // no actual validity fixes necessary, but the parsing and serialization process
      // does convert, eg, <br /> to <br>
      html: outputsamples.libreOfficeWindows,
      notes: [Note.DETECTED_LIBREOFFICE],
    };
    expect(actual).toEqual(expected);
  });
});

describe('msword', () => {
  it('should recognize msword', () => {
    // <meta name=Generator content="Microsoft Word 12">
    // working from a single sample here tbh
    const actual = fixhtml(inputsamples.msWord);
    const expected = {
      // Need to remove comments like <!--StartFragment-->
      // also <o:p> tags, which are useless
      html: outputsamples.msWord,
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
    const actual = fixhtml(inputsamples.scrivenerMacos);
    const expected = {
      html: outputsamples.scrivenerMacos,
      notes: [Note.DETECTED_MACOS],
    };
    expect(actual).toEqual(expected);
  });
  it('should recognize byword', () => {
    const actual = fixhtml(inputsamples.bywordMacos);
    const expected = {
      html: outputsamples.bywordMacos,
      notes: [Note.DETECTED_MACOS],
    };
    expect(actual).toEqual(expected);
  });
});
