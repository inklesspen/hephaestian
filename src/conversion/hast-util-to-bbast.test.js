import hscript from 'hastscript';
import uscript from 'unist-builder';
import { LoremIpsum } from 'lorem-ipsum';

import toBbast from './hast-util-to-bbast';

const lorem = new LoremIpsum();
const texts = [1, 2, 3, 4, 5, 6, 7].map(() => lorem.generateParagraphs(1));

describe('hast-util-to-bbast', () => {
  it('should handle h1 tags', () => {
    const input = uscript('root', [
      hscript('h1', 'Hello World'),
    ]);
    const expected = uscript('root', [
      uscript('block', [
        uscript('element', { tagName: 'size', properties: { '*': 7 } }, [
          uscript('element', { tagName: 'b' }, [
            uscript('text', 'Hello World'),
          ]),
        ]),
      ]),
    ]);
    const actual = toBbast(input);
    expect(actual).toEqual(expected);
  });

  it('should handle a tags', () => {
    const input = uscript('root', [
      hscript('a', { href: 'http://www.example.com' }, 'Please visit my blog'),
    ]);
    const expected = uscript('root', [
      uscript('element', { tagName: 'url', properties: { '*': 'http://www.example.com' } }, [
        uscript('text', 'Please visit my blog'),
      ]),
    ]);
    const actual = toBbast(input);
    expect(actual).toEqual(expected);
  });

  it('should handle p and div tags', () => {
    const input = uscript('root', [
      hscript('p', texts[0]),
      hscript('div', texts[1]),
    ]);
    const expected = uscript('root', [
      uscript('block', [
        uscript('text', texts[0]),
      ]),
      uscript('block', [
        uscript('text', texts[1]),
      ]),
    ]);
    const actual = toBbast(input);
    expect(actual).toEqual(expected);
  });

  it('should handle blockquote tags', () => {
    const input = uscript('root', [
      hscript('blockquote', texts[0]),
    ]);
    const expected = uscript('root', [
      uscript('element', { tagName: 'quote' }, [
        uscript('text', texts[0]),
      ]),
    ]);
    const actual = toBbast(input);
    expect(actual).toEqual(expected);
  });

  it('should handle hr tags', () => {
    const input = uscript('root', [
      hscript('p', texts[0]),
      hscript('hr'),
      hscript('p', texts[1]),
    ]);
    const expected = uscript('root', [
      uscript('block', [
        uscript('text', texts[0]),
      ]),
      uscript('element', { tagName: 'hr' }),
      uscript('block', [
        uscript('text', texts[1]),
      ]),
    ]);
    const actual = toBbast(input);
    expect(actual).toEqual(expected);
  });

  it('should handle bisu tags', () => {
    const input = uscript('root', [
      hscript('p', [
        hscript('b', 'Bold'),
        ' ',
        hscript('i', 'Italic'),
        ' ',
        hscript('s', 'Strikethru'),
        ' ',
        hscript('u', 'Underline'),
      ]),
    ]);
    const expected = uscript('root', [
      uscript('block', [
        uscript('element', { tagName: 'b' }, [uscript('text', 'Bold')]),
        uscript('text', ' '),
        uscript('element', { tagName: 'i' }, [uscript('text', 'Italic')]),
        uscript('text', ' '),
        uscript('element', { tagName: 's' }, [uscript('text', 'Strikethru')]),
        uscript('text', ' '),
        uscript('element', { tagName: 'u' }, [uscript('text', 'Underline')]),
      ]),
    ]);
    const actual = toBbast(input);
    expect(actual).toEqual(expected);
  });

  it('should handle centered text', () => {
    const input = uscript('root', [
      hscript('p.text-align', { style: 'text-align: center;' }, 'Hello World'),
    ]);
    const expected = uscript('root', [
      uscript('block', [
        uscript('element', { tagName: 'center' }, [
          uscript('text', 'Hello World'),
        ]),
      ]),
    ]);
    const actual = toBbast(input);
    expect(actual).toEqual(expected);
  });
});
