/* eslint-disable no-unused-vars */
import css from 'css';
import color from 'color';
import colorString from 'color-string';
import colorDiff from 'color-diff';

import hastscript from 'hastscript';
import uscript from 'unist-builder';
import produce, { original as immerOriginal } from 'immer';
import utilFind from 'unist-util-find';
import utilIs from 'unist-util-is';
import utilVisit from 'unist-util-visit';
import isElement from 'hast-util-is-element';
import hasProperty from 'hast-util-has-property';
import compareFunc from 'compare-func';
import hastClassList from 'hast-util-class-list';
import expandShorthand from 'css-shorthand-expand';
import parseUnit from 'parse-unit';

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
  'font-size', 'font-weight', 'font-style',
  'font-family',
  'text-decoration', // underline/strikethru
  'margin-left', // blockquotes
  'text-align',
  'color',
];

function allowDeclaration(d) {
  return propertyWhitelist.includes(d.property);
}

export const cssScript = {};
cssScript.d = (property, value) => ({ type: 'declaration', property, value });
cssScript.rmulti = (selector, declarations) => ({
  type: 'rule',
  selectors: [selector],
  declarations,
});
cssScript.r = (selector, declaration) => cssScript.rmulti(selector, [declaration]);


function expandShorthandDeclaration(d) {
  if (!shorthandProperties.includes(d.property)) return d;
  return Object.entries(expandShorthand(d.property, d.value))
    .map(([property, value]) => cssScript.d(property, value));
}

function inplaceFilterRule(rule) {
  const filtered = rule.declarations
    .flatMap(expandShorthandDeclaration).filter(allowDeclaration);
  filtered.sort(compareFunc('property')); // inplace sort
  // eslint-disable-next-line no-param-reassign
  rule.declarations = filtered;
}

function filterClassNameList(node, predicate) {
  // eslint-disable-next-line no-param-reassign
  node.properties.className = node.properties.className.filter(predicate);
}

function removeClasses(node, removeClassNames) {
  filterClassNameList(node, className => !removeClassNames.includes(className));
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
  sheet.stylesheet.rules.push(cssScript.r('.someclass', declaration));
  const ruleString = css.stringify(sheet, { compress: true });
  return extractDirectivesAndValues(ruleString);
}

function stripPositionInfo(rule) {
  // This function mutates the rule in place, but returns the rule
  // so it can be chained.
  /* eslint-disable no-param-reassign */
  delete rule.position;
  rule.declarations.forEach((d) => {
    delete d.position;
  });
  /* eslint-enable no-param-reassign */
  return rule;
}

class StylesheetManager {
  constructor(sheetString) {
    this.stylesheetContainer = makeEmptyStylesheet();
    if (sheetString) {
      this.importSheetString(sheetString);
    }
  }
  importSheetString(sheetString) {
    const parsed = css.parse(sheetString);
    const newRules = parsed.stylesheet.rules.map(stripPositionInfo);
    this.stylesheetContainer.stylesheet.rules.push(...newRules);
  }
  stringify(compress = true) {
    return css.stringify(this.stylesheetContainer, { compress });
  }
  getStyleElement(compress = true) {
    const value = this.stringify(compress);
    return hastscript('style', { type: 'text/css' }, value);
  }
}

class StyleMap extends StylesheetManager {
  constructor(counterStart = 0) {
    super();
    Object.defineProperty(this, 'rules', {
      get() { return this.stylesheetContainer.stylesheet.rules; },
      set(v) { this.stylesheetContainer.stylesheet.rules = v; },
    });
    this.classes = {};
    this.styleStrings = {};
    this.classNameCounter = counterStart;
  }
  makeClassName() {
    this.classNameCounter += 1;
    return `hephaestian-style-${this.classNameCounter}`;
  }

  addStyle(styleString) {
    if (styleString in this.styleStrings) {
      return this.styleStrings[styleString];
    }
    const newClassName = this.makeClassName();
    this.classes[newClassName] = styleString;
    this.styleStrings[styleString] = newClassName;
    const parsed = css.parse(`.${newClassName} {${styleString}}`);
    this.rules.push(stripPositionInfo(parsed.stylesheet.rules[0]));
    return newClassName;
  }
}

export class StyleWorkspace {
  constructor(hast) {
    this.hast = hast;
    this.styleMap = new StyleMap();
  }

  cycleStyleMap() {
    const oldStyleMap = this.styleMap;
    this.styleMap = new StyleMap(oldStyleMap.classNameCounter);
    return oldStyleMap.stringify();
  }

  inlineStylesToClassSelectorStyles() {
    utilVisit(this.hast, (node, index, parent) => {
      if (isElement(node) && hasProperty(node, 'style')) {
        const classList = hastClassList(node);
        classList.add(this.styleMap.addStyle(node.properties.style));
        // eslint-disable-next-line no-param-reassign
        delete node.properties.style;
      }
      return utilVisit.CONTINUE;
    });
  }

  makeSingleDeclarationSingleClassForm() {
    const sheet = new StylesheetManager(this.cycleStyleMap());
    utilVisit(this.hast, (node, index, parent) => {
      if (isElement(node, 'style')) {
        sheet.importSheetString(node.children[0].value);
        parent.children.splice(index, 1);
        return index;
      }
      return utilVisit.CONTINUE;
    });
    sheet.stylesheetContainer.stylesheet.rules.forEach((rule) => {
      rule.selectors.forEach((selector) => {
        rule.declarations.flatMap(expandShorthandDeclaration).forEach((declaration) => {
          const declarationText = extractDeclarationText(declaration);
          const newClass = this.styleMap.addStyle(declarationText);
          cssSelect.query(selector, this.hast).forEach((node) => {
            const classList = hastClassList(node);
            classList.add(newClass);
          });
        });
      });
    });
    const allowedClasses = Object.keys(this.styleMap.classes);
    const test = node => isElement(node) && hasProperty(node, 'className');
    utilVisit(this.hast, test, (node) => {
      filterClassNameList(node, className => allowedClasses.includes(className));
    });
  }

  narrowToBodyNode() {
    const bodyNode = utilFind(this.hast, node => isElement(node, 'body'));
    if (bodyNode) {
      this.hast = uscript('root', [bodyNode]);
    }
  }

  filterStyleProperties() {
    this.styleMap.rules.forEach((rule) => {
      const filtered = rule.declarations.filter(allowDeclaration);
      filtered.sort(compareFunc('property')); // inplace sort
      // eslint-disable-next-line no-param-reassign
      rule.declarations = filtered;
    });
    this.styleMap.rules = this.styleMap.rules.filter(rule => rule.declarations.length > 0);
  }

  normalizeLeftMargins() {
    const leftMarginRules = this.styleMap.rules
      .filter(rule => (rule.declarations[0].property === 'margin-left'));
    const leftMarginRuleData = {};
    const totalCharacterCount = charactersInNode(this.hast);
    const unitsFound = [];
    leftMarginRules.forEach((rule) => {
      const [strValue, unit] = parseUnit(rule.declarations[0].value);
      if (!unitsFound.includes(unit)) unitsFound.push(unit);
      const selector = rule.selectors[0];
      if (!leftMarginRuleData[strValue]) {
        leftMarginRuleData[strValue] = {
          numValue: parseFloat(strValue, 10),
          selectors: [],
          classes: [],
          characterCount: 0,
        };
      }
      leftMarginRuleData[strValue].selectors.push(rule.selectors[0]);
      leftMarginRuleData[strValue].classes.push(rule.selectors[0].substring(1));
    });
    if (unitsFound.length !== 1) return; // mixed units are bad
    Object.values(leftMarginRuleData).forEach((marginEntry) => {
      const selector = marginEntry.selectors.join(',');
      // eslint-disable-next-line no-param-reassign
      marginEntry.characterCount = cssSelect.query(selector, this.hast, true, true)
        .map(charactersInNode).reduce(sumReducer, 0);
    });
    const defaultLeftMargin = Object.values(leftMarginRuleData)
      .filter(marginEntry => ((marginEntry.characterCount / totalCharacterCount) > 0.75));
    const stripMargins = {
      selectors: [],
      classes: [],
    };
    const blockquoteMargins = {
      selectors: [],
      classes: [],
    };
    if (defaultLeftMargin.length === 1) {
      // there is a default!
      const threshold = defaultLeftMargin[0].numValue;
      Object.values(leftMarginRuleData).forEach((marginEntry) => {
        if (marginEntry.numValue <= threshold) {
          stripMargins.selectors.push(...marginEntry.selectors);
          stripMargins.classes.push(...marginEntry.classes);
        } else {
          blockquoteMargins.selectors.push(...marginEntry.selectors);
          blockquoteMargins.classes.push(...marginEntry.classes);
        }
      });
    } else {
      // no default; all left-margins to blockquotes
      Object.values(leftMarginRuleData).forEach((marginEntry) => {
        blockquoteMargins.selectors.push(...marginEntry.selectors);
        blockquoteMargins.classes.push(...marginEntry.classes);
      });
    }
    if (stripMargins.selectors.length > 0) {
      const selector = stripMargins.selectors.join(',');
      cssSelect.query(selector, this.hast).forEach((node) => {
        removeClasses(node, stripMargins.classes);
      });
    }
    if (blockquoteMargins.selectors.length > 0) {
      const selector = blockquoteMargins.selectors.join(',');
      cssSelect.query(selector, this.hast).forEach((node) => {
        removeClasses(node, blockquoteMargins.classes);
        // eslint-disable-next-line no-param-reassign
        node.tagName = 'blockquote';
      });
    }
    this.styleMap.rules = this.styleMap.rules.filter(rule => !leftMarginRules.includes(rule));
  }

  convertBisuToStyles() {
    // bold, italic, strikethru, underline
    const bisuStyleMap = {
      b: 'font-weight: bold',
      i: 'font-style: italic',
      s: 'text-decoration: line-through',
      u: 'text-decoration: underline',
    };
    const selector = Object.keys(bisuStyleMap).join(',');
    cssSelect.query(selector, this.hast).forEach((node) => {
      /* eslint-disable no-param-reassign */
      hastClassList(node).add(this.styleMap.addStyle(bisuStyleMap[node.tagName]));
      node.tagName = 'span';
      /* eslint-enable no-param-reassign */
    });
  }

  // convertStylesToBisu() {
  //   // bold, italic, strikethru, underline
  //   const styleBisuMap = {
  //     'font-weight: bold': 'b',
  //     'font-style: italic': 'i',
  //     'text-decoration: line-through': 's',
  //     'text-decoration: underline': 'u',
  //   };
  // }

  // stylesToNodes() {

  // }

  makeStylesInline() {
    /* eslint-disable no-param-reassign */
    this.styleMap.rules.forEach((rule) => {
      const inlineStyleString = extractDeclarationText(rule.declarations[0]);
      cssSelect.query(rule.selectors[0], this.hast).forEach((node) => {
        if (!node.properties.style) node.properties.style = '';
        node.properties.style += inlineStyleString;
      });
    });
    const test = node => isElement(node) && hasProperty(node, 'className');
    utilVisit(this.hast, test, (node) => {
      delete node.properties.className;
    });
    /* eslint-enable no-param-reassign */
  }
}

/** TODOs
  *
  * detect font weights and sizes and convert to heading tags, bold tags, etc
  *  - Scrivener copy-paste implements headings with font-size styles and <b> tags
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
      filterClassNameList(node, className => !removeClassNames.includes(className));
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
  // bold, italic, strikethru, underline
  const nextHast = produce(hast, (draftHast) => {
    /* eslint-disable no-param-reassign */
    const stylesheet = css.parse(draftHast.children[0].children[0].value);
    // TODO: finish implementing
    /* eslint-enable no-param-reassign */
  });
  return nextHast;
}

