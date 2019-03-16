import u from 'unist-builder';
import zwitch from 'zwitch';
import * as info from 'property-information';
import mapObj from 'map-obj';

const transformNode = zwitch('type');

function nodes(domNodes) {
  return domNodes.map(transformNode);
}

transformNode.handlers.text = domNode => u('text', domNode.data);
transformNode.handlers.comment = domNode => u('comment', domNode.data);
// transformNode.handlers.doctype = domNode => u('doctype') Need to see an example of this first
// TODO: script, style tags, if needed
transformNode.handlers.tag = (domNode) => {
  const children = nodes(domNode.children);
  const properties = mapObj(
    domNode.attribs,
    (key, value) => [info.find(info.html, key).property, value],
  );
  return u('element', {
    tagName: domNode.name,
    properties,
  }, children);
};

// eslint-disable-next-line no-unused-vars
function transformRootDomArray(domArray, options) {
  const children = nodes(domArray);
  return u('root', children);
}

export default function (domArray, options = {}) {
  return transformRootDomArray(domArray, options);
}
