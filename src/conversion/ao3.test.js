import hscript from 'hastscript';
import uscript from 'unist-builder';
import { LoremIpsum } from 'lorem-ipsum';
import unified from 'unified';
import rehypeParse from 'rehype-parse';

import ao3Convert from './ao3';
import rehypeParse5Stringify from '../processing/rehype-parse5-stringify';

const processor = unified()
  .use(rehypeParse)
  .use(rehypeParse5Stringify);

const lorem = new LoremIpsum();
const texts = [1, 2, 3, 4, 5, 6, 7].map(() => lorem.generateParagraphs(1));

function wrapWithDocument(...bodyChildren) {
  return uscript('root', [
    hscript('html', [
      hscript('head'),
      hscript('body', bodyChildren),
    ]),
  ]);
}

describe('ao3 formatting', () => {
  it('should return the contents of the body tag', () => {
    const input = processor.stringify(wrapWithDocument(hscript('p', texts[0]), hscript('hr'), hscript('p', texts[1]), hscript('p', texts[2])));
    const expected = processor.stringify(uscript('root', [hscript('p', texts[0]), hscript('hr'), hscript('p', texts[1]), hscript('p', texts[2])]));
    const actual = ao3Convert(input);
    expect(actual).toEqual(expected);
  });
  it('should adjust font sizes', () => {
    // ao3 only offers .font-big for 120% of normal and .font-small for 80% of normal
    const input = processor.stringify(wrapWithDocument(hscript('p', [
      hscript('span', 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read. On the left was a big button that read ['),
      hscript('span.font-size', { style: 'font-size:1.27273em;' }, 'INITIATE HACK'),
      hscript('span', '], with another, smaller, button reading ['),
      hscript('span.font-size', { style: 'font-size:0.72727em;' }, 'CANCEL'),
      hscript('span', '].'),
    ])));
    const expected = processor.stringify(uscript('root', [hscript('p', [
      hscript('span', 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read. On the left was a big button that read ['),
      hscript('span.font-big', 'INITIATE HACK'),
      hscript('span', '], with another, smaller, button reading ['),
      hscript('span.font-small', 'CANCEL'),
      hscript('span', '].'),
    ])]));
    const actual = ao3Convert(input);
    expect(actual).toEqual(expected);
  });
  it('should adjust text alignment', () => {
    const input = processor.stringify(wrapWithDocument(
      hscript('p', [
        hscript('span', 'I looked at the screen. It was a standard Hollywood UI, ...'),
      ]),
      hscript('p.text-align', { style: 'text-align:center;' }, [
        hscript('span', 'INITIATE HACK'),
      ]),
      hscript('p.text-align', { style: 'text-align:right;' }, [
        hscript('span', 'CANCEL'),
      ]),
    ));
    const expected = processor.stringify(uscript('root', [
      hscript('p', [
        hscript('span', 'I looked at the screen. It was a standard Hollywood UI, ...'),
      ]),
      hscript('p.align-center', [
        hscript('span', 'INITIATE HACK'),
      ]),
      hscript('p.align-right', [
        hscript('span', 'CANCEL'),
      ]),
    ]));
    const actual = ao3Convert(input);
    expect(actual).toEqual(expected);
  });
});
