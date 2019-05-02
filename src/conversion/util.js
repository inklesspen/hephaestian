import hasProperty from 'hast-util-has-property';

// eslint-disable-next-line import/prefer-default-export
export function hasClassName(node, className) {
  return hasProperty(node, 'className') && node.properties.className.includes(className);
}
