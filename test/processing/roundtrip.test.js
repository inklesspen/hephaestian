import toDiffableHtml from 'diffable-html';
import { roundtripFormat } from '../../src/processing/cleanup';

describe('roundtripFormat', () => {
  it('should roundtrip documents including font tags', () => {
    const input = `
    <!DOCTYPE html>
    <html lang="en">
      <head><title>Example</title></head>
      <body><font size="4">Hello World</font></body>
    </html>
    `;
    const actual = toDiffableHtml(roundtripFormat(input));
    const expected = toDiffableHtml(input);
    expect(actual).toEqual(expected);
  });
});
