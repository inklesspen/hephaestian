import unified from 'unified';
import rehypeDomStringify from 'rehype-dom-stringify';
import utilIs from 'unist-util-is';
import utilVisit from 'unist-util-visit';
import hastscript from 'hastscript';

import hastUtilFromHtmlparser2 from './htmlparser2-utils/hast-util-from-htmlparser2';


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

  // TODO: Mutates in place; should be feasible to have it return a copy instead... use immer
  /* eslint-disable no-param-reassign */
  utilVisit(hast, (node, index, parent) => {
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
    if (utilIs({ type: 'element' }, node) && node.properties.style && node.properties.style.includes('line-through')) {
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
}

// function detectScrivener(hast) {
//   // scrivener conversion
//   // pastes as full doc with stylesheets
//   // horizontal rules are done as a paragraph of non-breaking spaces,
//   // with {text-decoration: underline} applied
// }

export default function fixhtml(html, doc) {
  const processor = unified()
    .use(rehypeDomStringify, { fragment: true });
  // TODO: wrap in a parser
  const hast = hastUtilFromHtmlparser2(html);
  // TODO: convert these into transformers
  if (detectGoogleDocs(hast)) {
    fixGoogleDocs(hast, doc);
  }
  return processor.stringify(hast);
}
