import u from 'unist-builder';
import zwitch from 'zwitch';
import minifyWhitespace from 'rehype-minify-whitespace';

import { hasClassName, extractStyleRuleWithProperty } from './util';

// bbast is very much like hast
// but does not support comments, doctypes, or elements with tagName template
// Element property names do not undergo any transformation
// Except that a property named '*' has its value attached to the tagName
// eg: [url=http://google.com]Le Goog[/url] should become
// {type:"element",tagName:"url",properties:{"*":"http://google.com"},children:[{type:"text",value:"Le Goog"}]}
// furthermore, block level elements become wrapped in {type: 'block'}
// eg: <p>Hello World</p>
// {type: 'block', children: [{type: 'element', tagName: 'p', children: [...]}]}
// except the <p> tag should disappear.
// ok this is getting very complex. good thing we're gonna have tests.

function transformChildren(node) {
  if (node.children) {
    // eslint-disable-next-line no-use-before-define, no-param-reassign
    node.children = node.children.map(transformNode).filter(child => !!child);
  }
  return node;
}

function stripPositionData(node) {
  // eslint-disable-next-line no-param-reassign
  delete node.position;
  return node;
}

const transformElement = zwitch('tagName');

transformElement.handlers.h1 = (
  node => u('block', [
    u('element', { tagName: 'size', properties: { '*': 7 } }, [
      u('element', { tagName: 'b' }, node.children),
    ])])
);
transformElement.handlers.h2 = (
  node => u('block', [
    u('element', { tagName: 'size', properties: { '*': 6 } }, [
      u('element', { tagName: 'b' }, node.children),
    ])])
);
transformElement.handlers.h3 = (
  node => u('block', [
    u('element', { tagName: 'size', properties: { '*': 5 } }, [
      u('element', { tagName: 'b' }, node.children),
    ])])
);
transformElement.handlers.h4 = (
  node => u('block', [
    u('element', { tagName: 'b' }, node.children),
  ])
);
transformElement.handlers.h5 = (
  node => u('block', [
    u('element', { tagName: 'size', properties: { '*': 3 } }, [
      u('element', { tagName: 'b' }, node.children),
    ])])
);
transformElement.handlers.h6 = (
  node => u('block', [
    u('element', { tagName: 'size', properties: { '*': 2 } }, [
      u('element', { tagName: 'b' }, node.children),
    ])])
);

// eslint-disable-next-line no-console
transformElement.unknown = ((node) => { console.log(`Unhandled element ${node.tagName}`); });
transformElement.handlers.div = (node => u('block', node.children));
transformElement.handlers.p = transformElement.handlers.div;

transformElement.handlers.br = (() => u('text', '\n'));

const bisu = (node => u('element', { tagName: node.tagName }, node.children));
transformElement.handlers.b = bisu;
transformElement.handlers.i = bisu;
transformElement.handlers.s = bisu;
transformElement.handlers.u = bisu;

transformElement.handlers.a = (node => u('element', { tagName: 'url', properties: { '*': node.properties.href } }, node.children));
transformElement.handlers.hr = (() => u('element', { tagName: 'hr' }));

function transformStyles(node) {
  if (hasClassName(node, 'text-align')) {
    const alignment = extractStyleRuleWithProperty(node, 'text-align');
    if (alignment === 'center' || alignment === 'right') {
      // eslint-disable-next-line no-param-reassign
      node.children = [u('element', { tagName: alignment }, node.children)];
    }
  }
  // eslint-disable-next-line no-param-reassign
  delete node.properties.className;
  // eslint-disable-next-line no-param-reassign
  delete node.properties.style;
  // if (!hasProperty(node, 'style')) {
  //   return node;
  // }
  return node;
}

const transformNode = zwitch('type');
transformNode.handlers.root = (node => transformChildren(stripPositionData(node)));
transformNode.handlers.text = (node => stripPositionData(node));
transformNode.handlers.element = (
  node => transformElement(transformStyles(transformChildren(stripPositionData(node))))
);

const minifier = minifyWhitespace({ newlines: true });

export default function transform(tree) {
  return transformNode(minifier(tree));
}
