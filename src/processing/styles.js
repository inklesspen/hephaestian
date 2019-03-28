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
  // Order is important because some processing code will consider properties in this order
  'font-size', 'font-weight', 'font-style',
  'font-family',
  'text-decoration', // underline/strikethru
  'margin-left', 'margin-right', // blockquotes
  'text-align',
  'color',
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

/* TODOs
  *
  * detect font weights and sizes and convert to heading tags, bold tags, etc
  *  - squire converts:
  *    - font-weight: bold, font-weight: 700 (just that value) to <b>
  *    - font-style: italic to <i>
  *    - text-decoration: underline to <u>
  *  - if someone uses boldface or italics for normal body text, the answer is don't do that
  *  - detect majority margins, and then use that to detect blockquotes
  * detect "default" font settings and remove
  * attempt to detect monospace fonts
  * normalize colors into hex format
  * bump any class up to the parent element, if 2/3 or more coverage
  * eventually default to stripping color, controlled by option
  */

function removeClasses(node, removeClassNames) {
  // eslint-disable-next-line no-param-reassign
  node.properties.className = node.properties.className
    .filter(className => !removeClassNames.includes(className));
}

export function cleanupHeadingStyles(hast) {
  // gdocs headings use both h1/h2/h3 and font stylings; remove certain font styles inside headings
  const removeDeclarations = ['font-size', 'font-weight', 'font-style'];
  // css stylesheet is first child of first node
  const stylesheet = css.parse(hast.children[0].children[0].value);
  const removeClassSelectors = stylesheet.stylesheet.rules
    // these styles are in single class, single declaration format. pair up classes and properties
    .map(r => [r.selectors[0], r.declarations[0].property])
    // limit to properties that we want to remove
    .filter(p => removeDeclarations.includes(p[1]))
    // get just the classes; note these are actually class selectors, so .-prefixed
    .map(p => p[0]);
  const removeClassNames = removeClassSelectors.map(s => s.substring(1));
  const selector = `:matches(h1,h2,h3,h4,h5,h6) :matches(${removeClassSelectors.join(',')})`;
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    cssSelect.query(selector, draftHast).forEach((node) => {
      removeClasses(node, removeClassNames);
    });
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

export function normalizeFontWeights(hast) {
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    const styleMap = new StyleMap();
    const newNormalWeightClass = styleMap.addStyle('font-weight: normal');
    const newBoldWeightClass = styleMap.addStyle('font-weight: bold');
    const stylesheet = css.parse(draftHast.children[0].children[0].value);
    const fontWeightRules = stylesheet.stylesheet.rules
      .filter(rule => (rule.declarations[0].property === 'font-weight'));
    const normalWeightClassSelectors = [];
    const boldWeightClassSelectors = [];
    fontWeightRules.forEach((rule) => {
      // eslint-disable-next-line prefer-destructuring
      const value = rule.declarations[0].value;
      const selector = rule.selectors[0];
      if (value === 'normal') {
        normalWeightClassSelectors.push(selector);
      } else if (value === 'bold') {
        boldWeightClassSelectors.push(selector);
      } else {
        const intWeight = parseInt(value, 10);
        (intWeight < 600 ? normalWeightClassSelectors : boldWeightClassSelectors).push(selector);
      }
    });
    cssSelect.query(normalWeightClassSelectors.join(','), draftHast).forEach((node) => {
      node.properties.className.push(newNormalWeightClass);
    });
    cssSelect.query(boldWeightClassSelectors.join(','), draftHast).forEach((node) => {
      node.properties.className.push(newBoldWeightClass);
    });
    stylesheet.stylesheet.rules = stylesheet.stylesheet.rules.filter((rule) => {
      const selector = rule.selectors[0];
      return !(
        normalWeightClassSelectors.includes(selector)
        || boldWeightClassSelectors.includes(selector)
      );
    });
    stylesheet.stylesheet.rules.push(...styleMap.rules);
    draftHast.children[0].children[0].value = css.stringify(stylesheet, { compress: true });
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

export function makeStylesInline(hast) {
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    const stylesheetNode = draftHast.children.shift();
    const stylesheet = css.parse(stylesheetNode.children[0].value);
    stylesheet.stylesheet.rules.forEach((rule) => {
      const inlineStyleString = extractDeclarationText(rule.declarations[0]);
      cssSelect.query(rule.selectors[0], draftHast).forEach((node) => {
        if (!node.properties.style) node.properties.style = '';
        node.properties.style += inlineStyleString;
      });
    });
    utilVisit(draftHast, (node, index, parent) => {
      if (isElement(node) && hasProperty(node, 'className')) {
        delete node.properties.className;
      }
      return utilVisit.CONTINUE;
    });
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}
