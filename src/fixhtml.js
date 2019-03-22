import unified from 'unified';
import rehypeDomStringify from 'rehype-dom-stringify';
import utilIs from 'unist-util-is';
import utilVisit from 'unist-util-visit';
import hastscript from 'hastscript';
import produce from 'immer';
import utilInspect from 'unist-util-inspect';

// import hastUtilFromHtmlparser2 from './htmlparser2-utils/hast-util-from-htmlparser2';
import rehypeHtmlparser2Parse from './htmlparser2-utils/rehype-htmlparser2-parse';

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
 * utilIs('element', node) instead of isElementNamed('b', node)
 * should fix it
 *
 * Scrivener on Mac pastes as full HTML documents with stylesheets
 * horizontal rules are done as a paragraph of non-breaking spaces,
 * with {text-decoration: underline} applied
 *
 * Byword also produces full HTML documents, with doctypes
 * rehypeDomStringify can't accept anything other than elements as child of root
 */

function isElementNamed(tagName, node) {
  return utilIs({ type: 'element', tagName }, node);
}

function detectGoogleDocs(hast) {
  // Google Docs pastes always have two <meta charset='utf-8'> tags (one with double quotes)
  // followed by a <b> tag with an id that looks like:
  // docs-internal-guid-58cb565c-7fff-99d0-9f19-54c5612ca8fc
  // That <b> tag contains the actual HTML, for some stupid reason. It is always a root element.
  let foundBTag = false;
  utilVisit(hast, (node, _index, parent) => {
    if (isElementNamed('b', node) && parent.type === 'root' &&
      node.properties.id && node.properties.id.startsWith('docs-internal-guid-')) {
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

function fixGoogleDocs(hast, doc) {
  // There are some cleanups required before we can allow Squire to parse the HTML.
  const styleWorkElement = doc.createElement('span');

  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    utilVisit(draftHast, (node, index, parent) => {
      // See detectGoogleDocs for the full test, but we don't need to check the id here.
      if (isElementNamed('b', node) && parent.type === 'root') {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }
      // You can't have a <hr> inside a <p>. You just can't.
      // However, Squire (wrongly) believes <hr> is inline and will wrap it, adding an extra <br>.
      // We will have to account for that once the Squire phase is done.
      // TODO: Detect <div><hr><br></div> in Squire phase and show notice about it.
      if (isElementNamed('p', node)) {
        if (node.children.length === 1 && isElementNamed('hr', node.children[0])) {
          parent.children.splice(index, 1, ...node.children);
          return index;
        }
      }
      // if span with style text-decoration:line-through
      // change text-decoration to none, wrap contents in a <s>
      if (utilIs('element', node) && node.properties.style && node.properties.style.includes('line-through')) {
        styleWorkElement.style = node.properties.style;
        if (styleWorkElement.style.textDecoration === 'line-through') {
          styleWorkElement.style.textDecoration = 'none';
          node.properties.style = styleWorkElement.style.cssText;
          node.children = [hastscript('s', node.children)];
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
  window.lastHast = hast;
  // TODO: convert these into transformers
  if (detectGoogleDocs(hast)) {
    hast = fixGoogleDocs(hast, doc);
  }
  return processor.stringify(hast);
}

window.unifiedResources = {
  utilInspect,
  utilIs,
  utilVisit,
  hastscript,
  rehypeDomStringify,
  rehypeHtmlparser2Parse,
  unified,
  pruneNonElementRoots,
  produce,
};
