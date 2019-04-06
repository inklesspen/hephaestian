/* eslint-disable no-unused-vars */
import css from 'css';
import color from 'color';
import colorString from 'color-string';
import colorDiff from 'color-diff';

import hastscript from 'hastscript';
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
import { splitByCommas } from 'css-list-helpers';
import unquote from 'unquote';

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
  'vertical-align', // superscript and subscript use this
  'color',
];

const verticalAlignValueWhitelist = ['super', 'sub'];

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

function filterClassNameList(node, predicate) {
  // eslint-disable-next-line no-param-reassign
  node.properties.className = node.properties.className.filter(predicate);
}

function removeClasses(node, removeClassNames) {
  filterClassNameList(node, className => !removeClassNames.includes(className));
}

const sumReducer = (accumulator, currentValue) => accumulator + currentValue;

function charactersInNode(node) {
  if (utilIs('text', node)) {
    return node.value.length;
  }

  if (!Array.isArray(node.children)) {
    return 0;
  }

  return node.children.map(charactersInNode).reduce(sumReducer, 0);
}

function extractTextNodes(node) {
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
      this.hast.children = [bodyNode];
    }
  }

  filterStyleDeclarations() {
    this.styleMap.rules.forEach((rule) => {
      const filtered = rule.declarations.filter(allowDeclaration)
        .filter((declaration) => {
          if (declaration.property !== 'vertical-align') return true;
          return verticalAlignValueWhitelist.includes(declaration.value);
        });
      filtered.sort(compareFunc('property')); // inplace sort
      // eslint-disable-next-line no-param-reassign
      rule.declarations = filtered;
    });
    this.styleMap.rules = this.styleMap.rules.filter(rule => rule.declarations.length > 0);
  }

  cleanupHeadingStyles() {
    // gdocs headings use both h1/h2/h3 and font stylings;
    // so remove certain font styles inside headings
    const removePropertiesFromHeaders = ['font-size', 'font-weight', 'font-style'];
    const removeClassSelectors = this.styleMap.rules
      // these styles are in single class, single declaration format. pair up classes and properties
      .map(r => [r.selectors[0], r.declarations[0].property])
      // limit to properties that we want to remove
      .filter(p => removePropertiesFromHeaders.includes(p[1]))
      // get just the classes; note these are actually class selectors, so .-prefixed
      .map(p => p[0]);
    const removeClassNames = removeClassSelectors.map(s => s.substring(1));
    const selector = `:matches(h1,h2,h3,h4,h5,h6) :matches(${removeClassSelectors.join(',')})`;
    cssSelect.query(selector, this.hast).forEach((node) => {
      filterClassNameList(node, className => !removeClassNames.includes(className));
      removeClasses(node, removeClassNames);
    });
  }

  cleanupListItemStyles() {
    // gdocs puts margin-left on <li> tags; this throws off normalizeLeftMargins
    const removeClassSelectors = this.styleMap.rules
      // these styles are in single class, single declaration format. pair up classes and properties
      .map(r => [r.selectors[0], r.declarations[0].property])
      // limit to properties that we want to remove
      .filter(p => p[1] === 'margin-left')
      // get just the classes; note these are actually class selectors, so .-prefixed
      .map(p => p[0]);
    const removeClassNames = removeClassSelectors.map(s => s.substring(1));
    const selector = `li:matches(${removeClassSelectors.join(',')})`;
    cssSelect.query(selector, this.hast).forEach((node) => {
      filterClassNameList(node, className => !removeClassNames.includes(className));
      removeClasses(node, removeClassNames);
    });
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
          numValue: parseFloat(strValue),
          selectors: [],
          classes: [],
          characterCount: 0,
        };
      }
      leftMarginRuleData[strValue].selectors.push(selector);
      leftMarginRuleData[strValue].classes.push(selector.substring(1));
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

  normalizeFontWeights() {
    const newNormalWeightClass = this.styleMap.addStyle('font-weight: normal');
    const newBoldWeightClass = this.styleMap.addStyle('font-weight: bold');
    const fontWeightRules = this.styleMap.rules
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
    const rejectClasses = [...normalWeightClassSelectors, ...boldWeightClassSelectors]
      .map(s => s.substring(1))
      .filter(s => ![newNormalWeightClass, newBoldWeightClass].includes(s));
    cssSelect.query(normalWeightClassSelectors.join(','), this.hast).forEach((node) => {
      removeClasses(node, rejectClasses);
      node.properties.className.push(newNormalWeightClass);
    });
    cssSelect.query(boldWeightClassSelectors.join(','), this.hast).forEach((node) => {
      removeClasses(node, rejectClasses);
      node.properties.className.push(newBoldWeightClass);
    });
    const rulePredicate = rule => !rejectClasses.includes(rule.selectors[0].substring(1));
    this.styleMap.rules = this.styleMap.rules.filter(rulePredicate);
  }

  normalizeFontSizes() {
    // gdocs gives font sizes in pt
    // macos text framework (scrivener, etc) gives font sizes in px
    // and libreoffice gives font sizes in pt apparently?
    // nothing actually uses ems
    // and it doesn't actually matter if it's px or pt because we only care about relative values
    // we're assuming nobody actually uses keyword sizes.
    const fontSizeRules = this.styleMap.rules
      .filter(rule => (rule.declarations[0].property === 'font-size'));
    if (fontSizeRules.length === 0) return;
    const fontSizeRuleData = {};
    const totalCharacterCount = charactersInNode(this.hast);
    const unitsFound = [];
    fontSizeRules.forEach((rule) => {
      const [strValue, unit] = parseUnit(rule.declarations[0].value);
      if (!unitsFound.includes(unit)) unitsFound.push(unit);
      const selector = rule.selectors[0];
      if (!fontSizeRuleData[strValue]) {
        fontSizeRuleData[strValue] = {
          numValue: parseFloat(strValue),
          selectors: [],
          classes: [],
          characterCount: 0,
        };
      }
      fontSizeRuleData[strValue].selectors.push(selector);
      fontSizeRuleData[strValue].classes.push(selector.substring(1));
    });
    if (unitsFound.length !== 1) return; // mixed units are bad
    const fontSizeUnit = unitsFound[0];
    // we only handle pt and px right now.
    if (!['pt', 'px'].includes(fontSizeUnit)) return;
    Object.values(fontSizeRuleData).forEach((fontSizeEntry) => {
      const selector = fontSizeEntry.selectors.join(',');
      // eslint-disable-next-line no-param-reassign
      fontSizeEntry.characterCount = cssSelect.query(selector, this.hast, true, true)
        .map(charactersInNode).reduce(sumReducer, 0);
    });
    const candidateFontSizes = Object.values(fontSizeRuleData)
      .filter(fontSizeEntry => ((fontSizeEntry.characterCount / totalCharacterCount) > 0.75));
    // default to 11px/pt if no default found.
    const defaultFontSize = (candidateFontSizes.length === 1) ? candidateFontSizes[0].numValue : 11;
    Object.values(fontSizeRuleData).forEach((fontSizeEntry) => {
      const selector = fontSizeEntry.selectors.join(',');
      const newSize = parseFloat((fontSizeEntry.numValue / defaultFontSize).toFixed(5));
      const newSizeClass = this.styleMap.addStyle(`font-size: ${newSize}em`);
      cssSelect.query(selector, this.hast).forEach((node) => {
        removeClasses(node, fontSizeEntry.classes);
        node.properties.className.push(newSizeClass);
      });
    });
  }

  handleFontTags() {
    cssSelect.query('font', this.hast).forEach((node) => {
      /* eslint-disable no-param-reassign */
      if (node.properties.face) {
        hastClassList(node).add(this.styleMap.addStyle(`font-family:${node.properties.face}`));
      }
      delete node.properties.color;
      delete node.properties.size;
      delete node.properties.face;
      node.tagName = 'span';
      /* eslint-enable no-param-reassign */
    });
  }

  handleMonospaceFonts() {
    const fontFamilyRules = this.styleMap.rules
      .filter(rule => (rule.declarations[0].property === 'font-family'));
    const monospacePredicate = family => (
      family === 'monospace' || family.startsWith('Courier') || family.endsWith(' Mono') ||
      ['Consolas', 'Monaco', 'Menlo'].some(name => family === name)
    );
    const parseFamilyValue = familyValue => splitByCommas(familyValue).map(unquote);
    const monospaceFontFamilyRules = fontFamilyRules
      .filter(rule => parseFamilyValue(rule.declarations[0].value).some(monospacePredicate));
    const monospaceSelector = monospaceFontFamilyRules.map(rule => rule.selectors[0]).join(',');
    const monospaceClasses = monospaceFontFamilyRules.map(rule => rule.selectors[0].substring(1));
    cssSelect.query(monospaceSelector, this.hast).forEach((node) => {
      removeClasses(node, monospaceClasses);
      // eslint-disable-next-line no-param-reassign
      node.children = [hastscript('code', node.children)];
    });
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

  convertStylesToBisu() {
    // bold, italic, strikethru, underline
    const selectorMap = new Map([
      ['b', []],
      ['i', []],
      ['s', []],
      ['u', []],
    ]);
    // apparently arrays work fine when _storing_ keys in maps, but not when reading the values
    const styleBisuMap = new Map([
      ['font-weight: bold', 'b'],
      ['font-style: italic', 'i'],
      ['text-decoration: line-through', 's'],
      ['text-decoration: underline', 'u'],
    ]);
    this.styleMap.rules.forEach((rule) => {
      const declaration = rule.declarations[0];
      const lookupKey = [declaration.property, declaration.value].join(': ');
      if (!styleBisuMap.has(lookupKey)) return;
      selectorMap.get(styleBisuMap.get(lookupKey)).push(rule.selectors[0]);
    });
    selectorMap.forEach((selectors, tagName) => {
      const selector = selectors.join(',');
      const rejectClasses = selectors.map(s => s.substring(1));
      cssSelect.query(selector, this.hast).forEach((node) => {
        // this might yield spans with no classes and only one child
        // we'll clean that up in a separate stage
        removeClasses(node, rejectClasses);
        // eslint-disable-next-line no-param-reassign
        node.children = [hastscript(tagName, node.children)];
      });
    });
    const rejectSelectors = [
      ...selectorMap.get('b'), ...selectorMap.get('i'),
      ...selectorMap.get('s'), ...selectorMap.get('u'),
    ];
    const rulePredicate = rule => !rejectSelectors.includes(rule.selectors[0]);
    this.styleMap.rules = this.styleMap.rules.filter(rulePredicate);
  }

  convertStylesToSupSub() {
    const verticalAlignRules = this.styleMap.rules
      .filter(rule => (rule.declarations[0].property === 'vertical-align'));
    const superscriptRules = verticalAlignRules.filter(rule => rule.declarations[0].value === 'super');
    const superscriptSelector = superscriptRules.map(r => r.selectors[0]).join(',');
    const subscriptRules = verticalAlignRules.filter(rule => rule.declarations[0].value === 'sub');
    const subscriptSelector = subscriptRules.map(r => r.selectors[0]).join(',');
    const verticalAlignClasses = verticalAlignRules.map(r => r.selectors[0].substring(1));
    const fontSizeRules = this.styleMap.rules
      .filter(rule => (rule.declarations[0].property === 'font-size'));
    const fontSizeClasses = fontSizeRules.map(r => r.selectors[0].substring(1));
    [[superscriptSelector, 'sup'], [subscriptSelector, 'sub']].forEach(([selector, tagName]) => {
      cssSelect.query(selector, this.hast).forEach((node) => {
        removeClasses(node, verticalAlignClasses);
        removeClasses(node, fontSizeClasses);
        hastClassList(node).add(this.styleMap.addStyle('font-size:1em'));
        // eslint-disable-next-line no-param-reassign
        node.children = [hastscript(tagName, node.children)];
      });
    });
  }

  makeStylesInline(filterRules = true) {
    // all other properties have been dealt with
    const allowedProperties = ['font-size', 'text-align', 'color'];
    /* eslint-disable no-param-reassign */
    this.styleMap.rules.forEach((rule) => {
      const declaration = rule.declarations[0];
      if (filterRules) {
        if (!allowedProperties.includes(declaration.property)) return;
        // 1em is a nullop
        if (declaration.property === 'font-size' && declaration.value === '1em') return;
      }
      const inlineStyleString = extractDeclarationText(declaration);
      cssSelect.query(rule.selectors[0], this.hast).forEach((node) => {
        if (!node.properties.style) node.properties.style = '';
        node.properties.style += inlineStyleString;
      });
    });
    const predicate = node => isElement(node) && hasProperty(node, 'className');
    utilVisit(this.hast, predicate, (node) => {
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
  * normalize colors into hex format?
  * bump any class up to the parent element, if 2/3 or more coverage
  * eventually default to stripping color, controlled by option
  * strip font-size: 1em, font-weight: normal and font-style: normal,
  * after other processing complete
  * <p> inside <li>?
  */


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
