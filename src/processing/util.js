import utilIs from 'unist-util-is';
import realCssSelect from 'css-select';
import utilParents from 'unist-util-parents';

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

    if (!test || utilIs(test, node, index, lastParent)) {
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
