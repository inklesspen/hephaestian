import unified from 'unified';
import rehypeDomStringify from 'rehype-dom-stringify';
import rehypeDomParse from 'rehype-dom-parse';
import utilIs from 'unist-util-is';
import utilVisit from 'unist-util-visit';
import hastscript from 'hastscript';
import isElement from 'hast-util-is-element';
import produce from 'immer';
import utilInspect from 'unist-util-inspect';
import utilParents from 'unist-util-parents';
import hastUtilSelect from 'hast-util-select';
import css from 'css';
import dotProp from 'dot-prop';

import {
  StyleWorkspace,
// eslint-disable-next-line import/no-duplicates
} from './styles';
// eslint-disable-next-line import/no-duplicates
import * as styleFuncs from './styles';
import { cssSelect } from './util';

// import hastUtilFromHtmlparser2 from '../htmlparser2-utils/hast-util-from-htmlparser2';
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
  let foundBTag = false;
  utilVisit(hast, (node, _index, parent) => {
    if (isElement(node, 'b') && parent.type === 'root' &&
      dotProp.get(node, 'properties.id', '').startsWith('docs-internal-guid-')) {
      foundBTag = true;
      return utilVisit.EXIT;
    }
    if (utilIs({ type: 'element' }, node)) {
      return utilVisit.SKIP; // No need to look at children of elements.
    }
    return utilVisit.CONTINUE;
  });
  return foundBTag;
}

// eslint-disable-next-line no-unused-vars
function fixGoogleDocs(hast) {
  // There are some cleanups required before we can allow Squire to parse the HTML.

  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    utilVisit(draftHast, (node, index, parent) => {
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
      // However, Squire (wrongly) believes <hr> is inline and will wrap it, adding an extra <br>.
      // We will have to account for that once the Squire phase is done.
      // TODO: Detect <div><hr><br></div> in Squire phase and show notice about it.
      if (isElement(node, 'p')) {
        if (node.children.length === 1 && isElement(node.children[0], 'hr')) {
          parent.children.splice(index, 1, ...node.children);
          return index;
        }
      }
      return utilVisit.CONTINUE;
    });
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

function pruneNonElementRoots(hast) {
  if (!utilIs('root', hast)) {
    return hast;
  }
  const nextHast = produce(hast, (draftHast) => {
    // eslint-disable-next-line no-param-reassign
    draftHast.children = hast.children.filter(node => utilIs('element', node));
  });
  return nextHast;
}

export default function fixhtml(html, doc) {
  const processor = unified()
    .use(rehypeHtmlparser2Parse)
    .use(rehypeDomStringify, { fragment: true });
  let hast = processor.parse(html);
  hast = pruneNonElementRoots(hast);
  // TODO: convert these into transformers
  if (detectGoogleDocs(hast)) {
    hast = fixGoogleDocs(hast, doc);
  }
  hast = produce(hast, (draftHast) => {
    const ws = new StyleWorkspace(draftHast);
    ws.inlineStylesToClassSelectorStyles();
    ws.makeSingleDeclarationSingleClassForm();
    ws.filterStyleDeclarations();
    ws.cleanupHeadingStyles();
    ws.cleanupListItemStyles();
    ws.normalizeLeftMargins();
    ws.normalizeFontWeights();
    ws.convertStylesToBisu();
    ws.convertStylesToSupSub();
    ws.makeStylesInline();
  });
  window.lastHast = hast;
  return processor.stringify(hast);
}

window.unifiedResources = {
  utilInspect,
  utilIs,
  utilVisit,
  utilParents,
  hastscript,
  rehypeDomStringify,
  rehypeDomParse,
  rehypeHtmlparser2Parse,
  unified,
  hastUtilSelect,
  pruneNonElementRoots,
  produce,
  cssSelect,
  css,
  ...styleFuncs,
};
