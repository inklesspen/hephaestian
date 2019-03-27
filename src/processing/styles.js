/* eslint-disable no-unused-vars */
import CSSselect from 'css-select';
import css from 'css';
import colorString from 'color-string';
import colorDiff from 'color-diff';

import hastscript from 'hastscript';
import produce, { original as immerOriginal } from 'immer';
import utilIs from 'unist-util-is';
import utilVisit from 'unist-util-visit';
import isElement from 'hast-util-is-element';
import hasProperty from 'hast-util-has-property';
import compareFunc from 'compare-func';
import hastClassList from 'hast-util-class-list';
import gud from 'gud';
import expandShorthand from 'css-shorthand-expand';

import { cssSelect } from './util';

function extractDirectivesAndValues(rule) {
  const start = rule.indexOf('{') + 1;
  const end = rule.lastIndexOf('}');
  return rule.substring(start, end);
}

const shorthandProperties = [
  // technically text-decoration is also a shorthand property
  // but we can ignore that; it's never mattered so far
  'font', 'margin',
];

const propertyWhitelist = [
  'text-align',
  'color',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'text-decoration', // underline/strikethru
  'margin-left', 'margin-right', // blockquotes
];

function allowDeclaration(d) {
  return propertyWhitelist.includes(d.property);
}

function expandShorthandDeclaration(d) {
  if (!shorthandProperties.includes(d.property)) return d;
  return Object.entries(expandShorthand(d.property, d.value))
    .map(([property, value]) => ({ type: 'declaration', property, value }));
}

function inplaceFilterRule(rule) {
  const filtered = rule.declarations
    .flatMap(expandShorthandDeclaration).filter(allowDeclaration);
  filtered.sort(compareFunc('property')); // inplace sort
  // eslint-disable-next-line no-param-reassign
  rule.declarations = filtered;
}

// eslint-disable-next-line import/prefer-default-export
export function filterStyles(hast) {
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    utilVisit(draftHast, (node, index, parent) => {
      if (isElement(node) && node.properties.style) {
        const styleString = `${node.tagName} {${node.properties.style}}`;
        const parsed = css.parse(styleString);
        const rule = parsed.stylesheet.rules[0]; // there's only one
        inplaceFilterRule(rule);
        const ruleString = css.stringify(parsed, { compress: true });
        const newStyleAttr = extractDirectivesAndValues(ruleString);
        if (newStyleAttr) {
          node.properties.style = newStyleAttr;
        } else {
          delete node.properties.style;
        }
      }
      if (isElement(node, 'style')) {
        const styleString = node.children[0].value;
        const parsed = css.parse(styleString);
        parsed.stylesheet.rules.forEach((rule) => { inplaceFilterRule(rule); });
        node.children[0].value = css.stringify(parsed, { compress: true });
      }
      return utilVisit.CONTINUE;
    });
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

/* TODOs
  *
  * detect font weights and sizes and convert to heading tags, bold tags, etc
  *  - gdocs headings use both h1/h2/h3 and font stylings.
  *  - squire converts:
  *    - font-weight: bold, font-weight: 700 (just that value) to <b>
  *    - font-style: italic to <i>
  *    - text-decoration: underline to <u>
  *  - so we convert font-weight: normal to 400, and bold to 700
  *  - then find the body font-weight and normalize.
  * detect "default" font settings and remove
  * attempt to detect monospace fonts
  * normalize colors into hex format
  * bump any class up to the parent element, if 2/3 or more coverage
  * materialize declarations back into style attrs
  * eventually default to stripping color, controlled by option
  */

const sumReducer = (accumulator, currentValue) => accumulator + currentValue;

export function charactersInNode(node) {
  if (utilIs('text', node)) {
    return node.value.length;
  }

  if (!Array.isArray(node.children)) {
    return 0;
  }

  return node.children.map(charactersInNode).reduce(sumReducer, 0);
}

export function extractTextNodes(node) {
  const textNodes = [];
  utilVisit(node, (visitedNode) => {
    if (utilIs('text', visitedNode)) {
      textNodes.push(visitedNode);
    }
  });
  return textNodes;
}

const makeEmptyStylesheet = () => ({ type: 'stylesheet', stylesheet: { rules: [], parsingErrors: [] } });

function extractDeclarationText(declaration) {
  const sheet = makeEmptyStylesheet();
  sheet.stylesheet.rules.push({
    type: 'rule',
    selectors: ['.someclass'],
    declarations: [declaration],
  });
  const ruleString = css.stringify(sheet, { compress: true });
  return extractDirectivesAndValues(ruleString);
}

class StyleMap {
  constructor() {
    this.stylesheetContainer = makeEmptyStylesheet();
    this.rules = this.stylesheetContainer.stylesheet.rules;
    this.classes = {};
    this.styleStrings = {};
  }

  addStyle(styleString) {
    if (styleString in this.styleStrings) {
      return this.styleStrings[styleString];
    }
    const newClassName = `hephaestian-style-${gud()}`;
    this.classes[newClassName] = styleString;
    this.styleStrings[styleString] = newClassName;
    const parsed = css.parse(`.${newClassName} {${styleString}}`);
    this.rules.push(parsed.stylesheet.rules[0]);
    return newClassName;
  }

  getStyleElement() {
    const value = css.stringify(this.stylesheetContainer, { compress: true });
    // const value = css.stringify(this.stylesheetContainer);
    return hastscript('style', { type: 'text/css' }, value);
  }
}

export function inlineStylesToClassSelectorStyles(hast) {
  const nextHast = produce(hast, (draftHast) => {
    const styleMap = new StyleMap();
    /* eslint-disable no-param-reassign */
    utilVisit(draftHast, (node, index, parent) => {
      if (isElement(node) && hasProperty(node, 'style')) {
        const classList = hastClassList(node);
        classList.add(styleMap.addStyle(node.properties.style));
        delete node.properties.style;
      }
      return utilVisit.CONTINUE;
    });
    draftHast.children.unshift(styleMap.getStyleElement());
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

export function makeSingleDeclarationSingleClassForm(hast) {
  const nextHast = produce(hast, (draftHast) => {
    const styleNodes = [];
    const styleMap = new StyleMap();
    /* eslint-disable no-param-reassign */
    utilVisit(draftHast, (node, index, parent) => {
      if (isElement(node, 'style')) {
        styleNodes.push(immerOriginal(node));
        parent.children.splice(index, 1);
        return index;
      }
      return utilVisit.CONTINUE;
    });
    styleNodes.forEach((styleNode) => {
      const styleNodeText = styleNode.children[0].value;
      const parsed = css.parse(styleNodeText);
      parsed.stylesheet.rules.forEach((rule) => {
        rule.selectors.forEach((selector) => {
          rule.declarations.forEach((declaration) => {
            const declarationText = extractDeclarationText(declaration);
            const newClass = styleMap.addStyle(declarationText);
            cssSelect.query(selector, draftHast).forEach((node) => {
              const classList = hastClassList(node);
              classList.add(newClass);
            });
          });
        });
      });
    });
    draftHast.children.unshift(styleMap.getStyleElement());
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}
