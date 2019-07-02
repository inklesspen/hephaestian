import unified from 'unified';
import utilMap from 'unist-util-map';
import utilFind from 'unist-util-find';
import utilIs from 'unist-util-is';
import isElement from 'hast-util-is-element';
import remarkParse from 'remark-parse';
import remarkToRehype from 'remark-rehype';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import rehypeParse5Stringify from './rehype-parse5-stringify';
import { rehypeDocumentSettings } from './util';
import Note from './notes';

const TAG_NORMALIZATIONS = {
  em: 'i',
  strong: 'b',
  del: 's',
};

function normalizeTagNames() {
  function transformer(node) {
    return utilMap(node, (someNode) => {
      if (isElement(someNode, Object.keys(TAG_NORMALIZATIONS))) {
        return { ...someNode, tagName: TAG_NORMALIZATIONS[someNode.tagName] };
      }
      return someNode;
    });
  }
  return transformer;
}

export const processor = unified()
  .use(remarkParse)
  .use(remarkToRehype)
  .use(normalizeTagNames)
  .use(rehypeDocument, rehypeDocumentSettings)
  .use(rehypeFormat)
  .use(rehypeParse5Stringify);

const htmlPredicate = (node => utilIs(node, 'html'));

export function mdastToHast(mdast) {
  const notes = [];
  if (utilFind(mdast, htmlPredicate)) {
    notes.push(Note.DETECTED_HTML_IN_MARKDOWN);
  }
  const hast = processor.runSync(mdast);
  return { hast, notes };
}

export default function process(md) {
  const mdast = processor.parse(md);
  const { hast, notes } = mdastToHast(mdast);
  const html = processor.stringify(hast);
  return { html, notes };
}
