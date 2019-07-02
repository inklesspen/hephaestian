import unified from 'unified';
import rehypeParse from 'rehype-parse';

import utilIs from 'unist-util-is';
import realCssSelect from 'css-select';
import utilParents from 'unist-util-parents';
import utilFind from 'unist-util-find';
import isElement from 'hast-util-is-element';
import unistBuilder from 'unist-builder';

import * as cssSelectHastAdapter from './css-select-hast-adapter';

class AdaptedCssSelect {
  constructor(adapter) {
    this.options = { adapter };
  }

  query(query, elems, unwrap = true, removeSubsets = false) {
    const wrapped = Array.isArray(elems) ? elems.map(utilParents) : utilParents(elems);
    let wrappedResult = realCssSelect(query, wrapped, this.options);
    if (removeSubsets) {
      wrappedResult = this.options.adapter.removeSubsets(wrappedResult);
    }
    if (!unwrap) return wrappedResult;
    return wrappedResult.map(p => p.node);
  }

  queryOne(query, elems) {
    const wrapped = Array.isArray(elems) ? elems.map(utilParents) : utilParents(elems);
    const wrappedResult = realCssSelect.selectOne(query, wrapped, this.options);
    return (wrappedResult ? wrappedResult.node : null);
  }

  hasAny(query, elems) {
    // if any elements match the query
    return this.queryOne(query, elems) !== null;
  }
}

export const cssSelect = new AdaptedCssSelect(cssSelectHastAdapter);

const CONTINUE = true;
const EXIT = false;

export function visitChildrenFirst(tree, test, visitor) {
  if (typeof test === 'function' && typeof visitor !== 'function') {
    // eslint-disable-next-line no-param-reassign
    [visitor, test] = [test, null];
  }
  function one(node, index, parents) {
    let result;
    const lastParent = parents[parents.length - 1] || null;

    if (node.children) {
      // eslint-disable-next-line no-use-before-define
      result = all(node.children, parents.concat(node));
    }

    if (result === EXIT) {
      return result;
    }

    if (!test || utilIs(node, test, index, lastParent)) {
      result = visitor(node, index, lastParent);
    }

    return result;
  }
  function all(children, parents) {
    const min = -1;
    const step = 1;
    let index = (min) + step;
    let child;
    let result;

    while (index > min && index < children.length) {
      child = children[index];
      result = child && one(child, index, parents);

      if (result === EXIT) {
        return result;
      }

      index = typeof result === 'number' ? result : index + step;
    }
    return CONTINUE;
  }
  one(tree, null, []);
}

visitChildrenFirst.CONTINUE = CONTINUE;
visitChildrenFirst.EXIT = EXIT;

export function nodeContainsText(node) {
  return utilIs(node, 'text') || (node.children && node.children.some(nodeContainsText));
}

export function getBodyContents(hast) {
  const bodyNode = utilFind(hast, node => isElement(node, 'body'));
  return unistBuilder('root', bodyNode.children);
}

export function extractDirectivesAndValues(rule) {
  const start = rule.indexOf('{') + 1;
  const end = rule.lastIndexOf('}');
  return rule.substring(start, end);
}

const hephaestianVersionNumber = process.env.REACT_APP_VERSION;
export const rehypeDocumentSettings = {
  title: 'Hephaestian document',
  meta: [{ name: 'generator', content: `Hephaestian v${hephaestianVersionNumber}` }],
  responsive: false,
};

const parserProcessor = unified().use(rehypeParse);

export function isHephaestianGeneratedHtml(html) {
  const hast = parserProcessor.parse(html);
  const metaNode = utilFind(hast, node => isElement(node, 'meta') && node.properties.name === 'generator');
  if (!metaNode) return false;
  const metaContent = metaNode.properties.content;
  return metaContent.startsWith('Hephaestian');
}
