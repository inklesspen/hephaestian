/* eslint-disable no-unused-vars */
import CSSselect from 'css-select';
import css from 'css';
import color from 'color';
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

/** TODOs
  *
  * detect font weights and sizes and convert to heading tags, bold tags, etc
  *  - Scrivener copy-paste implements headings with font-size styles and <b> tags
  *  - convert <b>/<i>/etc tags into corresponding styles
  *  - Assume anything with a size style and bold style covering the whole contents
  *    of the <p> or <div> is a header. Collect all such headers and compare sizes to
  *    determine priority.
  *  - squire converts:
  *    - font-weight: bold, font-weight: 700 (just that value) to <b>
  *    - font-style: italic to <i>
  *    - text-decoration: underline to <u>
  *  - if someone uses boldface or italics for normal body text, the answer is don't do that
  *  - detect majority margins, and then use that to detect blockquotes
  * detect "default" font settings and remove
  *  - find default font-size, set to 1 em, and set everything else to multiples of 1 em
  *  - if the incoming font-sizes are in em, leave them as they are and may god have mercy
  *  - otherwise use convert-css-length and parse-unit
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

const removePropertiesFromHeaders = ['font-size', 'font-weight', 'font-style'];
export function cleanupHeadingStyles(hast) {
  // gdocs headings use both h1/h2/h3 and font stylings; remove certain font styles inside headings
  // css stylesheet is first child of first node
  const stylesheet = css.parse(hast.children[0].children[0].value);
  const removeClassSelectors = stylesheet.stylesheet.rules
    // these styles are in single class, single declaration format. pair up classes and properties
    .map(r => [r.selectors[0], r.declarations[0].property])
    // limit to properties that we want to remove
    .filter(p => removePropertiesFromHeaders.includes(p[1]))
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

export function normalizeFontSizes(hast) {
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    // determine character count for each size rule, find default
    // convert that default to 1em and normalize everything else around it
    const totalCharacterCount = charactersInNode(draftHast.children[1]);
    const styleMap = new StyleMap();
    const stylesheet = css.parse(draftHast.children[0].children[0].value);
    const fontSizeRules = stylesheet.stylesheet.rules
      .filter(rule => (rule.declarations[0].property === 'font-size'));
    stylesheet.stylesheet.rules.push(...styleMap.rules);
    draftHast.children[0].children[0].value = css.stringify(stylesheet, { compress: true });
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

export function removeDefaultFontFamily(hast) {
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    const stylesheet = css.parse(draftHast.children[0].children[0].value);
    const fontFamilyRules = stylesheet.stylesheet.rules
      .filter(rule => (rule.declarations[0].property === 'font-family'));
    const families = {};
    fontFamilyRules.forEach((rule) => {
      const familyName = rule.declarations[0].value;
      if (!families[familyName]) {
        families[familyName] = {
          selectors: [],
          classes: [],
          characterCount: 0,
        };
      }
      const familyEntry = families[familyName];
      familyEntry.selectors.push(rule.selectors[0]);
      familyEntry.classes.push(rule.selectors[0].substring(1));
    });
    const totalCharacterCount = charactersInNode(draftHast.children[1]);
    Object.values(families).forEach((familyEntry) => {
      const selector = familyEntry.selectors.join(',');
      familyEntry.characterCount = cssSelect.query(selector, draftHast.children[1])
        .map(charactersInNode).reduce(sumReducer, 0);
    });
    const defaultFamilies = Object.values(families)
      .filter(familyEntry => ((familyEntry.characterCount / totalCharacterCount) > 0.75));
    if (defaultFamilies.length === 1) {
      // we have our default!
      const familyEntry = defaultFamilies[0];
      const selector = familyEntry.selectors.join(',');
      cssSelect.query(selector, draftHast.children[1]).forEach((node) => {
        removeClasses(node, familyEntry.classes);
      });
    }
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

export function removeDefaultColor(hast) {
  // a default color is either 000000 or FFFFFF
  // if you use another color for your body text you are an affront to god
  // but we do need to account for different ways of expressing color,
  // which is why the color library is here
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    const stylesheet = css.parse(draftHast.children[0].children[0].value);
    const colorRules = { white: [], black: [] };
    stylesheet.stylesheet.rules
      .filter(rule => (rule.declarations[0].property === 'color'))
      // prefix with the hex-conversion of the color
      .map(rule => [color(rule.declarations[0].value).hex(), rule])
      // only black or white please
      .filter(pair => ['#000000', '#FFFFFF'].includes(pair[0]))
      .forEach((pair) => {
        colorRules[(pair[0] === '#000000' ? 'black' : 'white')].push(pair[1]);
      });
    const totalCharacterCount = charactersInNode(draftHast.children[1]);
    const colorCharacterCounts = { white: 0, black: 0 };
    ['black', 'white'].forEach((colorName) => {
      const selector = colorRules[colorName].flatMap(rule => rule.selectors[0]).join(',');
      colorCharacterCounts[colorName] = cssSelect.query(selector, draftHast.children[1], true, true)
        .map(charactersInNode).reduce(sumReducer, 0);
    });
    let defaultColorName = null;
    // black takes precedence; this ain't chess
    ['black', 'white'].forEach((colorName) => {
      if ((colorCharacterCounts[colorName] / totalCharacterCount > 0.75)) {
        defaultColorName = colorName;
      }
    });
    if (defaultColorName) {
      const selector = colorRules[defaultColorName].flatMap(rule => rule.selectors[0]).join(',');
      const classNames = colorRules[defaultColorName]
        .flatMap(rule => rule.selectors[0].substring(1));
      cssSelect.query(selector, draftHast.children[1]).forEach((node) => {
        removeClasses(node, classNames);
      });
    }
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

const upPropagateProperties = [
  'font-size', 'font-weight', 'font-style',
  'font-family',
  'text-decoration', // underline/strikethru
  'color',
];

export function upPropagateStyles(hast) {
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    const stylesheet = css.parse(draftHast.children[0].children[0].value);
    const upPropagateRules = stylesheet.stylesheet.rules
      .filter(rule => upPropagateProperties.includes(rule.declarations[0].property));
    const upPropagateSelectors = upPropagateRules.map(rule => rule.selectors[0]);
    const selectorClassMap = new Map(upPropagateProperties.map(s => [s, s.substring(1)]));
    // if all children of a parent have a class, move that class to the parent
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

export function makeBisuNodes(hast) {
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    const stylesheet = css.parse(draftHast.children[0].children[0].value);
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
