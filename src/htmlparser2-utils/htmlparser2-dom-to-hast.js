import u from 'unist-builder';
import h from 'hastscript';
import zwitch from 'zwitch';
import * as info from 'property-information';
import mapObj from 'map-obj';

const transformNode = zwitch('type');

function nodes(domNodes) {
  // transformNode may return undefined for things it doesn't recognize
  // remove those with .filter()
  return domNodes.map(transformNode).filter(node => !!node);
}

function mapAttribs(attribs) {
  return mapObj(
    attribs,
    (key, value) => [info.find(info.html, key).property, value],
  );
}

transformNode.handlers.text = domNode => u('text', domNode.data);
transformNode.handlers.comment = domNode => u('comment', domNode.data);
// Technically directives can be other things than doctypes.
// but I haven't found an example yet, so...
transformNode.handlers.directive = (domNode) => {
  const split = domNode.data.split(' ');

  // Don't _need_ that public and system values.
  return u('doctype', { name: split[1], public: null, system: null });
};
transformNode.handlers.style = domNode => h('style', mapAttribs(domNode.attribs), domNode.children[0].data);
transformNode.handlers.tag = (domNode) => {
  const children = nodes(domNode.children);
  const properties = mapAttribs(domNode.attribs);
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
