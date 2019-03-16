import { parseDOM } from 'htmlparser2';
import domToHast from './htmlparser2-dom-to-hast';

const parserDefaults = {
  withStartIndices: true,
  withEndIndices: true,
  decodeEntities: true,
};

export default html => domToHast(parseDOM(html, parserDefaults));
