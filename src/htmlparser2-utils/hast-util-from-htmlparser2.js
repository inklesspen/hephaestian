import { parseDOM } from 'htmlparser2';
import domToHast from './htmlparser2-dom-to-hast';

// An early version of rehype-parse worked with htmlparser2
// https://github.com/rehypejs/rehype/blob/0dbea955ba5274e089227e5c71022ff125387888/packages/rehype-parse/lib/parser.js
// consult if necessary

const parserDefaults = {
  withStartIndices: true,
  withEndIndices: true,
  decodeEntities: true,
};

export default html => domToHast(parseDOM(html, parserDefaults));
