import unified from 'unified';
import rehypeDomStringify from 'rehype-dom-stringify';
import utilIs from 'unist-util-is';
import utilVisit from 'unist-util-visit';
import hastscript from 'hastscript';
import isElement from 'hast-util-is-element';
import dotProp from 'dot-prop';

import Note from './notes';
import { cssSelect } from './util';

import rehypeHtmlparser2Parse from '../htmlparser2-utils/rehype-htmlparser2-parse';

/*
 * Different rich text engines, different platforms, tons of bad behaviors.
 *
 * On Chrome for Mac, copying from Google Docs produces behavior I've adjusted for.
 * On iPad, copying from the Google Docs app produces different behavior. There's no <meta> tags
 * or wrapping <b> tag; instead the docs-internal-guid is on the first actual tag.
 * <hr> have an empty <p> before and after them.
 * Apparently the behavior on other browsers is slightly different:
 * https://github.com/ckeditor/ckeditor-dev/issues/835#issuecomment-326234829
 *
 * isElement(node) instead of isElement(node, 'b') should fix it
 *
 * Scrivener on Mac pastes as full HTML documents with stylesheets
 * horizontal rules are done as a paragraph of non-breaking spaces,
 * with {text-decoration: underline} applied
 *
 * Byword also produces full HTML documents, with doctypes
 * rehypeDomStringify can't accept anything other than elements as child of root
 */

function detectGoogleDocs(hast) {
  // Google Docs pastes always have two <meta charset='utf-8'> tags (one with double quotes)
  // followed by a <b> tag with an id that looks like:
  // docs-internal-guid-58cb565c-7fff-99d0-9f19-54c5612ca8fc
  // That <b> tag contains the actual HTML, for some stupid reason. It is always a root element.
  // on iOS, however, the root appears to be <p>.
  let foundGuidTag = false;
  utilVisit(hast, (node, _index, parent) => {
    if (isElement(node) && parent.type === 'root' &&
      dotProp.get(node, 'properties.id', '').startsWith('docs-internal-guid-')) {
      foundGuidTag = true;
      return utilVisit.EXIT;
    }
    if (utilIs({ type: 'element' }, node)) {
      return utilVisit.SKIP; // No need to look at children of elements.
    }
    return utilVisit.CONTINUE;
  });
  return foundGuidTag;
}

function detectPasteSource(hast) {
  if (detectGoogleDocs(hast)) return [Note.DETECTED_GOOGLE_DOCS];
  const generatorSelector = 'meta[name=generator],meta[name=Generator]';
  const generatorNode = cssSelect.queryOne(generatorSelector, hast);
  /** @type {string} */
  const generatorValue = dotProp.get(generatorNode, 'properties.content', '');
  if (generatorValue === 'Cocoa HTML Writer') return [Note.DETECTED_MACOS];
  if (generatorValue.includes('LibreOffice')) return [Note.DETECTED_LIBREOFFICE];
  return [];
}

function fixGoogleDocs(hast) {
  // There are some cleanups required before we can let the DOM touch the HTML.

  utilVisit(hast, (node, index, parent) => {
    // See detectGoogleDocs for the full test, but we don't need to check the id here.
    if (isElement(node, 'b') && parent.type === 'root') {
      parent.children.splice(index, 1, hastscript('div', node.children));
      return index;
    }
    if (isElement(node, 'meta') && parent.type === 'root') {
      parent.children.splice(index, 1); // remove meta node
      return index;
    }
    // You can't have a <hr> inside a <p>. You just can't.
    if (isElement(node, 'p')) {
      if (node.children.length === 1 && isElement(node.children[0], 'hr')) {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }
    }
    return utilVisit.CONTINUE;
  });
}

function pruneNonElementRoots(hast) {
  if (!utilIs('root', hast)) {
    return;
  }
  // eslint-disable-next-line no-param-reassign
  hast.children = hast.children.filter(node => utilIs('element', node));
}

export default function fixhtml(html) {
  const processor = unified()
    .use(rehypeHtmlparser2Parse)
    .use(rehypeDomStringify, { fragment: true });
  const hast = processor.parse(html);
  pruneNonElementRoots(hast);
  // import produce from 'immer';
  // hast = produce(hast, (draftHast) => {
  // });
  const processingNotes = detectPasteSource(hast);
  if (processingNotes.includes(Note.DETECTED_GOOGLE_DOCS)) {
    fixGoogleDocs(hast);
  }
  return {
    html: processor.stringify(hast),
    notes: processingNotes,
  };
}
