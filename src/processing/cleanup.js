import domPurify from 'dompurify';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import unified from 'unified';
import rehypeParse from 'rehype-parse';

import utilFind from 'unist-util-find';
import isElement from 'hast-util-is-element';
import reduce from 'immer';
import isWhitespace from 'hast-util-whitespace';

import fixhtml from './fixhtml';
import cleanStyles from './styles';
import rehypeParse5Stringify from './rehype-parse5-stringify';

const domPurifyOptions = {
  FORBID_ATTR: ['dir'],
};

export function roundtripFormat(html) {
  // this currently exists for use in tests, but may have a non-test use in future
  // keep the processor structure in sync with makeFullDocument, except
  // not using rehype-document or fragment=true
  const processor = unified()
    .use(rehypeParse)
    .use(rehypeFormat)
    .use(rehypeParse5Stringify);
  return processor.processSync(html).contents;
}

function makeFullDocument(html) {
  const processor = unified()
    // Note to self: most invocations of rehypeParse should NOT use fragment=true
    // this will badly mangle complete doucuments,
    // but the output of cleanStyles() is always a fragment.
    .use(rehypeParse, { fragment: true })
    .use(rehypeDocument, {
      title: 'Hephaestian document',
      meta: [{ name: 'generator', content: 'Hephaestian vUNKNOWN' }],
      responsive: false,
    })
    .use(rehypeFormat)
    .use(rehypeParse5Stringify);
  return processor.processSync(html).contents;
}

// TODO: consider extracting this to a file
class JunkRemover {
  constructor(hast) {
    this.hast = hast;
    this.bodyNode = utilFind(hast, node => isElement(node, 'body'));
  }
  hasLeadingBrOrWhitespace() {
    const firstChild = this.bodyNode.children[0];
    return isElement(firstChild, 'br') || isWhitespace(firstChild);
  }
  removeLeadingBrOrWhitespace() {
    if (this.hasLeadingBrOrWhitespace()) {
      this.bodyNode.children.splice(0, 1);
    }
  }
  hasTrailingBrOrWhitespace() {
    const lastChild = this.bodyNode.children[this.bodyNode.children.length - 1];
    return isElement(lastChild, 'br') || isWhitespace(lastChild);
  }
  removeTrailingBrOrWhitespace() {
    if (this.hasTrailingBrOrWhitespace()) {
      this.bodyNode.children.splice((this.bodyNode.children.length - 1), 1);
    }
  }
  hasUnnecessaryDiv() {
    if (this.bodyNode.children.length > 1) return false;
    const child = this.bodyNode.children[0];
    if (!isElement(child, 'div')) return false;
    return child.children.some(node => isElement(node, ['div', 'p']));
  }
  removeUnnecessaryDiv() {
    if (this.hasUnnecessaryDiv()) {
      this.bodyNode.children = this.bodyNode.children[0].children;
    }
  }
  run() {
    const changesNeeded = () => (
      this.hasLeadingBrOrWhitespace() ||
      this.hasTrailingBrOrWhitespace() ||
      this.hasUnnecessaryDiv());
    while (changesNeeded()) {
      this.removeLeadingBrOrWhitespace();
      this.removeTrailingBrOrWhitespace();
      this.removeUnnecessaryDiv();
    }
  }
}

export function removeJunk(hast) {
  return reduce(hast, (draftHast) => {
    const remover = new JunkRemover(draftHast);
    remover.run();
  });
}

function removeJunkFromHtml(html) {
  const processor = unified()
    .use(rehypeParse)
    .use(rehypeParse5Stringify);
  const hast = processor.parse(html);
  const dejunked = removeJunk(hast);
  const newHtml = processor.stringify(dejunked);
  return newHtml;
}

export function cleanupRichText(html) {
  const validated = fixhtml(html);
  const cleanedHtml = domPurify.sanitize(validated.html, domPurifyOptions);
  const result = cleanStyles(cleanedHtml, validated.notes);
  const fullDocument = makeFullDocument(result.html);
  return {
    html: removeJunkFromHtml(fullDocument),
    notes: result.notes,
  };
}
