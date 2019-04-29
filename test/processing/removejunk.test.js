import hscript from 'hastscript';
import uscript from 'unist-builder';
import { LoremIpsum } from 'lorem-ipsum';
import rehypeFormat from 'rehype-format';
import unified from 'unified';

import { removeJunk } from '../../src/processing/cleanup';

const lorem = new LoremIpsum();

const formatProcessor = unified().use(rehypeFormat);

function wrapWithDocument(...bodyChildren) {
  return uscript('root', [
    hscript('html', [
      hscript('head'),
      hscript('body', bodyChildren),
    ]),
  ]);
}

describe('removeJunk', () => {
  it('should leave an okay document alone', () => {
    const pText = lorem.generateParagraphs(1);
    const inputHast = wrapWithDocument(
      hscript('p', pText),
      hscript('p', pText),
      hscript('p', pText),
    );
    const expected = inputHast;
    const actual = removeJunk(inputHast);
    expect(actual).toEqual(expected);
  });

  it('should remove leading <br> tags', () => {
    const pText = lorem.generateParagraphs(1);
    const inputHast = wrapWithDocument(
      hscript('br'),
      hscript('br'),
      hscript('p', pText),
      hscript('p', pText),
      hscript('p', pText),
    );
    const expected = wrapWithDocument(
      hscript('p', pText),
      hscript('p', pText),
      hscript('p', pText),
    );
    const actual = removeJunk(inputHast);
    expect(actual).toEqual(expected);
  });

  it('should remove trailing <br> tags', () => {
    const pText = lorem.generateParagraphs(1);
    const inputHast = wrapWithDocument(
      hscript('p', pText),
      hscript('p', pText),
      hscript('p', pText),
      hscript('br'),
      hscript('br'),
    );
    const expected = wrapWithDocument(
      hscript('p', pText),
      hscript('p', pText),
      hscript('p', pText),
    );
    const actual = removeJunk(inputHast);
    expect(actual).toEqual(expected);
  });

  it('should unwrap unnecessary <div> tags', () => {
    const pText = lorem.generateParagraphs(1);
    const inputHast = wrapWithDocument(hscript('div', [
      hscript('div', [
        hscript('p', pText),
        hscript('p', pText),
        hscript('p', pText),
      ]),
    ]));
    const expected = wrapWithDocument(
      hscript('p', pText),
      hscript('p', pText),
      hscript('p', pText),
    );
    const actual = removeJunk(inputHast);
    expect(actual).toEqual(expected);
  });

  it('should handle a complex case', () => {
    const pText = lorem.generateParagraphs(1);
    const inputHast = wrapWithDocument(
      hscript('br'),
      '\n',
      hscript('div', [
        hscript('div', [
          hscript('p', pText),
          hscript('p', pText),
          hscript('p', pText),
        ]),
        '\n',
        hscript('br'),
      ]),
    );
    const expected = wrapWithDocument(
      hscript('p', pText),
      hscript('p', pText),
      hscript('p', pText),
    );
    const formattedInput = formatProcessor.runSync(inputHast);
    const formattedExpected = formatProcessor.runSync(expected);
    const actual = removeJunk(formattedInput);
    // this isn't great, but removeJunk returns a frozen tree, so...
    const unfrozenActual = JSON.parse(JSON.stringify(actual));
    const formattedActual = formatProcessor.runSync(unfrozenActual);
    expect(formattedActual).toEqual(formattedExpected);
  });
});
