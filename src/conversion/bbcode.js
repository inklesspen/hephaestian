import unified from 'unified';
import rehypeParse from 'rehype-parse';
import zwitch from 'zwitch';

import { getBodyContents } from '../processing/util';

import toBbast from './hast-util-to-bbast';

function stringifyChildren(node) {
  if (node.children) {
    // eslint-disable-next-line no-use-before-define, no-param-reassign
    node.children = node.children.map(stringifyNode);
  }
  return node;
}

const stringifyElement = zwitch('tagName');
stringifyElement.unknown = (
  node => `[${node.tagName.toUpperCase()}]${node.children.join('')}[/${node.tagName.toUpperCase()}]`
);
stringifyElement.handlers.hr = (() => '[HR]\n\n');
stringifyElement.handlers.quote = ((node) => {
  const rawContents = node.children.join('');
  const trimmed = rawContents.trimEnd();
  const ending = rawContents.substring(trimmed.length);
  return `[QUOTE]${trimmed}[/QUOTE]${ending}`;
});

const stringifyNode = zwitch('type');
stringifyNode.handlers.root = (node => stringifyChildren(node).children.join(''));
stringifyNode.handlers.text = (node => node.value);
stringifyNode.handlers.block = (node => `${stringifyChildren(node).children.join('')}\n\n`);
stringifyNode.handlers.element = (node => stringifyElement(stringifyChildren(node)));

function stringify(bbast) {
  // return JSON.stringify(bbast, null, 2);
  return stringifyNode(bbast);
}

const processor = unified()
  .use(rehypeParse);

export default function convert(html) {
  const docHast = processor.parse(html);
  const bodyContents = getBodyContents(docHast);
  const bbast = toBbast(bodyContents);
  const bbcode = stringify(bbast);
  return bbcode;
}
