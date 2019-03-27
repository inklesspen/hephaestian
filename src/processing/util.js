import utilIs from 'unist-util-is';
import realCssSelect from 'css-select';
import utilParents from 'unist-util-parents';

import * as cssSelectHastAdapter from './css-select-hast-adapter';

export function isElementNamed(tagName, node) {
  return utilIs({ type: 'element', tagName }, node);
}

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
}

export const cssSelect = new AdaptedCssSelect(cssSelectHastAdapter);
