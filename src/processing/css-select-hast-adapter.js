import isElement from 'hast-util-is-element';
import utilIs from 'unist-util-is';
import sst from 'space-separated-tokens';
import * as info from 'property-information';

/**
 * This adapts css-select to work with hast trees.
 * This adapter _must_ be used with unist-util-parents.
 */

export function isTag(node) {
  return isElement(node);
}

export function getChildren(node) {
  return node.children || [];
}

export function existsOne(predicate, elems) {
  return elems.some((node) => {
    if (!isElement(node)) return false;
    return predicate(node) || existsOne(predicate, getChildren(node));
  });
}

export function getAttributeValue(elem, name) {
  if (!elem.properties) {
    return null;
  }
  const property = info.find(info.html, name);
  if (property.property in elem.properties) {
    const value = elem.properties[property.property];
    return property.spaceSeparated ? sst.stringify(value) : value;
  }
  return null;
}

export function getName(node) {
  return node.tagName;
}

export function getParent(node) {
  return node.parent;
}

export function getSiblings(node) {
  const parent = getParent(node);
  return parent ? getChildren(parent) : [node];
}

export function getText(node) {
  if (Array.isArray(node)) return node.map(getText).join('');

  if (isTag(node)) return getText(getChildren(node));

  if (utilIs(node, 'text')) return node.value;

  return '';
}

export function hasAttrib(node, name) {
  const property = info.find(info.html, name);
  return property.property in node.properties;
}

export function removeSubsets(nodes) {
  // adapted from https://github.com/nrkn/css-select-base-adapter
  let idx = nodes.length;

  // Check if each node (or one of its ancestors) is already contained in the
  // array.
  // eslint-disable-next-line no-plusplus
  while (--idx > -1) {
    const node = nodes[idx];
    let ancestor = node;

    // Temporarily remove the node under consideration
    // eslint-disable-next-line no-param-reassign
    nodes[idx] = null;
    let replace = true;

    while (ancestor) {
      if (nodes.indexOf(ancestor) > -1) {
        replace = false;
        nodes.splice(idx, 1);
        break;
      }
      ancestor = getParent(ancestor);
    }

    // If the node has been found to be unique, re-insert it.
    if (replace) {
      // eslint-disable-next-line no-param-reassign
      nodes[idx] = node;
    }
  }

  return nodes;
}

export function findAll(predicate, nodes) {
  const found = [];
  nodes.forEach((node) => {
    if (predicate(node)) {
      found.push(node);
    }
    found.push(...findAll(predicate, getChildren(node)));
  });
  return found;
}

export function findOne(predicate, nodes) {
  // can't use for...of because eslint doesn't like it.
  // check webpack settings to see if we can allow it.
  for (let idx = 0; idx < nodes.length; idx += 1) {
    const node = nodes[idx];
    if (predicate(node)) {
      return node;
    }
    if (getChildren(node).length > 0) {
      const child = findOne(predicate, getChildren(node));
      if (child) {
        return child;
      }
    }
  }
  return null;
}

export function equals(a, b) {
  return a.node === b.node;
}
