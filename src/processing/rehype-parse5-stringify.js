import { serialize as parse5Serialize } from 'parse5';
import hastUtilToParse5 from 'hast-util-to-parse5';
import utilVisit from 'unist-util-visit';
import isElement from 'hast-util-is-element';
import reduce from 'immer';

function makeAttrValuesStrings(hast) {
  // due to https://github.com/syntax-tree/hast-util-to-parse5/issues/5
  // we must walk the tree and convert every attribute value to a string
  return reduce(hast, (draftHast) => {
    utilVisit(draftHast, node => isElement(node), (node) => {
      if (node.properties) {
        Object.keys(node.properties).forEach((propName) => {
          const value = node.properties[propName];
          if (value !== null && value !== undefined &&
            value !== false && !(value instanceof String)) {
            // eslint-disable-next-line no-param-reassign
            node.properties[propName] = value.toString();
          }
        });
      }
    });
  });
}

export default function stringify(options) {
  // eslint-disable-next-line no-unused-vars
  const settings = { ...options, ...this.data('settings') };

  function compiler(tree) {
    const hast = makeAttrValuesStrings(tree);
    const ast = hastUtilToParse5(hast);
    return parse5Serialize(ast);
  }

  this.Compiler = compiler;
}
