import unified from 'unified';
import rehypeParse from 'rehype-parse';

import css from 'css';
import hastscript from 'hastscript';
import uscript from 'unist-builder';
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

import rehypeParse5Stringify from './rehype-parse5-stringify';
import {
  cssSelect, visitChildrenFirst, nodeContainsText, extractDirectivesAndValues,
} from './util';
import Note from './notes';

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

  /**
   * @param {string} className
   */
  static isStyleMapClass(className) {
    return className.startsWith('hephaestian-style-');
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
  constructor(hast, notes = []) {
    this.hast = hast;
    this.notes = notes;
    this.styleMap = new StyleMap();
  }

  cycleStyleMap() {
    const oldStyleMap = this.styleMap;
    this.styleMap = new StyleMap(oldStyleMap.classNameCounter);
    return oldStyleMap.stringify();
  }

  inlineStylesToClassSelectorStyles() {
    utilVisit(this.hast, (node) => {
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
    let foundStyleNodes = false;
    utilVisit(this.hast, node => isElement(node, 'style'), (node, index, parent) => {
      foundStyleNodes = true;
      sheet.importSheetString(node.children[0].value);
      parent.children.splice(index, 1);
      return index;
    });
    if (foundStyleNodes) this.notes.push(Note.PROCESSED_STYLESHEET);
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
    const predicate = node => isElement(node) && hasProperty(node, 'className');
    utilVisit(this.hast, predicate, (node) => {
      filterClassNameList(node, className => allowedClasses.includes(className));
    });
  }

  narrowToBodyNode() {
    const bodyNode = utilFind(this.hast, node => isElement(node, 'body'));
    if (bodyNode) {
      this.notes.push(Note.NARROWED_TO_BODY);
      this.hast.children = [...bodyNode.children];
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
    // no need to normalize font sizes if there's no size rules
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
    this.notes.push(Note.NORMALIZED_FONT_SIZE);
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
      family === 'monospace' || family.startsWith('Courier') || family.endsWith(' Mono')
      || ['Consolas', 'Monaco', 'Menlo'].some(name => family === name)
    );
    const parseFamilyValue = familyValue => splitByCommas(familyValue).map(unquote);
    const monospaceFontFamilyRules = fontFamilyRules
      .filter(rule => parseFamilyValue(rule.declarations[0].value).some(monospacePredicate));
    const monospaceSelector = monospaceFontFamilyRules.map(rule => rule.selectors[0]).join(',');
    const monospaceClasses = monospaceFontFamilyRules.map(rule => rule.selectors[0].substring(1));
    let monospaceHandled = false;
    cssSelect.query(monospaceSelector, this.hast).forEach((node) => {
      removeClasses(node, monospaceClasses);
      // eslint-disable-next-line no-param-reassign
      node.children = [hastscript('code', node.children)];
      monospaceHandled = true;
    });
    if (monospaceHandled) this.notes.push(Note.MONOSPACE);
  }

  removeEmptySpans() {
    utilVisit(this.hast, node => isElement(node, 'span'), (node, index, parent) => {
      if (node.children.length === 0) {
        parent.children.splice(index, 1);
        return index;
      }
      return utilVisit.CONTINUE;
    });
  }

  handleWhitespaceBetweenParasUnnested() {
    // in gdocs, if a user hits enter twice at the end of a paragraph to make a blank line,
    // this comes out as <p>...</p><br><p>...</p>
    // therefore, if over half the paragraph tags are followed by br and then another paragraph tag,
    // remove all brs that follow paragraph tags.

    const pNodes = cssSelect.query('p', this.hast);

    // p + br:has(+ p) ought to work, but doesn't: https://github.com/fb55/css-select/issues/111
    // so we'll use utilVisit
    const brNodes = [];
    utilVisit(this.hast, node => isElement(node, 'br'), (node, index, parent) => {
      // if the parent of the <br> is a <p> which contains text, it does not qualify for this
      if (isElement(parent, 'p') && nodeContainsText(parent)) return utilVisit.CONTINUE;
      const prev = parent.children[index - 1];
      const next = parent.children[index + 1];
      if ([prev, next].every(n => isElement(n, 'p'))) {
        brNodes.push(node);
      }
      return utilVisit.CONTINUE;
    });
    if (brNodes.length > (pNodes.length / 2)) {
      this.notes.push(Note.INTER_PARA_SPACING);
      // due to hast structure, the easiest way to remove these nodes is to set a flag on them
      brNodes.forEach((node) => {
        // eslint-disable-next-line no-param-reassign
        node.properties.deleteme = true;
      });
      // then visit the tree with utilVisit and remove the nodes with the flag
      utilVisit(this.hast, node => isElement(node, 'br'), (node, index, parent) => {
        if (node.properties.deleteme) {
          parent.children.splice(index, 1);
          return index;
        }
        return utilVisit.CONTINUE;
      });
    } else if (brNodes.length > 0) {
      this.notes.push(Note.DETECTED_IRREGULAR_INTER_PARA_SPACING);
    }
  }

  handleWhitespaceWithinParas() {
    // in gdocs, if the user hits shift-Enter twice to make a blank line, it comes out as
    // <p>Text<br><br>Text</p>. Or, worse, if styling is applied,
    // <p><span>Text</span><span><br></span><span><br></span><span>Text</span></p>
    const pNodes = cssSelect.query('p', this.hast);
    const pNodesWithBrs = pNodes.filter(node => cssSelect.queryOne('br', node));
    if (!(pNodesWithBrs.length > (pNodes.length / 2))) {
      if (pNodesWithBrs.length > 0) {
        this.notes.push(Note.DETECTED_IRREGULAR_INTER_PARA_SPACING);
      }
      return;
    }
    this.notes.push(Note.INTER_PARA_SPACING);
    pNodesWithBrs.forEach((node) => {
      const template = hastscript('p');
      template.properties = { ...node.properties };
      // eslint-disable-next-line no-param-reassign
      node.children = node.children.map((child) => {
        if (!nodeContainsText(child)) {
          return null;
        }
        const newP = { ...template, children: [child] };
        return newP;
      }).filter(child => child);
      // eslint-disable-next-line no-param-reassign
      node.properties.unpackme = true;
    });
    utilVisit(this.hast, node => isElement(node, 'p'), (node, index, parent) => {
      if (node.properties.unpackme) {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }
      return utilVisit.CONTINUE;
    });
  }

  handleWhitespaceBetweenParasNested() {
    // cocoa text does it differently, of course:
    // <p style="min-height: 18.0px"><br></p>
    // there might be a <span> inside the <p> though
    // <p style="min-height: 18.0px"><span style="font-kerning: none"></span><br></p>
    // and LibreOffice just has <p style="text-indent: 0.5in; margin-bottom: 0in"><br/></p>
    // where the <p> styles are the same styles used on all other <p> tags.
    // make a method that removes spans with no content.
    // then just detect <p><br><p> the same way we detect <br> for gdocs

    const realParas = [];
    const brParas = [];

    const isBrPara = (node => isElement(node, 'p') && node.children.length === 1 && isElement(node.children[0], 'br'));
    utilVisit(this.hast, node => isElement(node, 'p'), (node, index, parent) => {
      if (isBrPara(node)) {
        const prev = parent.children[index - 1];
        const next = parent.children[index + 1];
        if ([prev, next].every(n => !isBrPara(n))) {
          brParas.push(node);
        }
      } else {
        realParas.push(node);
      }
      return utilVisit.CONTINUE;
    });
    if (brParas.length > (realParas.length / 2)) {
      this.notes.push(Note.INTER_PARA_SPACING);
      // due to hast structure, the easiest way to remove these nodes is to set a flag on them
      brParas.forEach((node) => {
        // eslint-disable-next-line no-param-reassign
        node.properties.deleteme = true;
      });
      // then visit the tree with utilVisit and remove the nodes with the flag
      utilVisit(this.hast, node => isElement(node, 'p'), (node, index, parent) => {
        if (node.properties.deleteme) {
          parent.children.splice(index, 1);
          return index;
        }
        return utilVisit.CONTINUE;
      });
    } else if (brParas.length > 0) {
      this.notes.push(Note.DETECTED_IRREGULAR_INTER_PARA_SPACING);
    }
  }

  handleWhitespaceBetweenParasEmptyPara() {
    const realParas = [];
    const emptyParas = [];

    const isEmptyPara = (node => isElement(node, 'p') && node.children.length === 0);
    utilVisit(this.hast, node => isElement(node, 'p'), (node, index, parent) => {
      if (isEmptyPara(node)) {
        const prev = parent.children[index - 1];
        const next = parent.children[index + 1];
        if ([prev, next].every(n => !isEmptyPara(n))) {
          emptyParas.push(node);
        }
      } else {
        realParas.push(node);
      }
      return utilVisit.CONTINUE;
    });
    if (emptyParas.length > (realParas.length / 2)) {
      this.notes.push(Note.INTER_PARA_SPACING);
      // due to hast structure, the easiest way to remove these nodes is to set a flag on them
      emptyParas.forEach((node) => {
        // eslint-disable-next-line no-param-reassign
        node.properties.deleteme = true;
      });
      // then visit the tree with utilVisit and remove the nodes with the flag
      utilVisit(this.hast, node => isElement(node, 'p'), (node, index, parent) => {
        if (node.properties.deleteme) {
          parent.children.splice(index, 1);
          return index;
        }
        return utilVisit.CONTINUE;
      });
    } else if (emptyParas.length > 0) {
      this.notes.push(Note.DETECTED_IRREGULAR_INTER_PARA_SPACING);
    }
  }

  handleWhitespaceBetweenParas() {
    // TODO: refactor both of these together
    if (this.notes.includes(Note.DETECTED_GOOGLE_DOCS)) {
      this.handleWhitespaceBetweenParasUnnested();
      this.handleWhitespaceWithinParas();
    }
    if (
      this.notes.includes(Note.DETECTED_LIBREOFFICE)
      || this.notes.includes(Note.DETECTED_MACOS)) {
      this.handleWhitespaceBetweenParasNested();
    }
    if (this.notes.includes(Note.DETECTED_MSWORD)) {
      this.handleWhitespaceBetweenParasEmptyPara();
    }
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

  makeStylesInline(filterRules = true, assignClasses = true) {
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
        if (assignClasses) {
          hastClassList(node).add(declaration.property);
        }
      });
    });
    const predicate = node => isElement(node) && hasProperty(node, 'className');
    utilVisit(this.hast, predicate, (node) => {
      filterClassNameList(node, className => !StyleMap.isStyleMapClass(className));
      if (node.properties.className.length === 0) {
        delete node.properties.className;
      }
    });
    /* eslint-enable no-param-reassign */
  }

  removeUnneededSpans() {
    utilVisit(this.hast, node => isElement(node, 'span'), (node, index, parent) => {
      if (Object.keys(node.properties).length === 0) {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }
      return utilVisit.CONTINUE;
    });
  }

  handleLeadingTrailingBisuWhitespace() {
    const handledElements = ['b', 'i', 's', 'u', 'sup', 'sub', 'span'];
    const predicate = (
      node => isElement(node)
      && handledElements.includes(node.tagName)
      && node.children.length > 0
    );
    // can't use utilVisit because we need to visit children before the node itself.
    // if a node is a handledElement and the children start with or end with whitespace
    // then move the whitespace to the parent, as siblings of this.

    visitChildrenFirst(this.hast, predicate, (node, index, parent) => {
      let offset = 0;
      if (utilIs('text', node.children[0]) && node.children[0].value.startsWith(' ')) {
        const oldValue = node.children[0].value;
        const newValue = oldValue.trimLeft();
        if (newValue.length > 0) {
          // eslint-disable-next-line no-param-reassign
          node.children[0].value = newValue;
        } else {
          node.children.splice(0, 1);
        }
        const chars = oldValue.substring(0, (oldValue.length - newValue.length));
        const newTextNode = uscript('text', chars);
        parent.children.splice(index + offset, 0, newTextNode);
        offset += 1;
      }
      offset += 1;
      const lastChildIndex = node.children.length - 1;
      if (utilIs('text', node.children[lastChildIndex]) && node.children[lastChildIndex].value.endsWith(' ')) {
        const oldValue = node.children[lastChildIndex].value;
        const newValue = oldValue.trimRight();
        if (newValue.length > 0) {
          // eslint-disable-next-line no-param-reassign
          node.children[lastChildIndex].value = newValue;
        } else {
          node.children.splice(lastChildIndex, 1);
        }
        const chars = oldValue.substring(newValue.length);
        const newTextNode = uscript('text', chars);
        parent.children.splice(index + offset, 0, newTextNode);
        offset += 1;
      }
      return index + offset;
    });
  }
}

/** TODOs
  *
  * detect font weights and sizes and convert to heading tags, bold tags, etc
  *  - MacOS copy-paste implements headings with font-size styles and <b> tags
  *  - Assume anything with a size style and bold style covering the whole contents
  *    of the <p> or <div> is a header. Collect all such headers and compare sizes to
  *    determine priority.
  * remove <p> inside <li>?
  * detect <hr> substitutes, like "centered * * *", and convert?
  */

export default function cleanStyles(html, notes) {
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeParse5Stringify);
  const hast = processor.parse(html);
  const newNotes = [...notes];
  const ws = new StyleWorkspace(hast, newNotes); // will mutate hast, newNotes
  ws.inlineStylesToClassSelectorStyles();
  ws.makeSingleDeclarationSingleClassForm();
  if (!ws.notes.includes(Note.DETECTED_GOOGLE_DOCS)) {
    ws.narrowToBodyNode();
  }
  if (ws.notes.includes(Note.DETECTED_LIBREOFFICE)) {
    ws.handleFontTags();
  }
  ws.filterStyleDeclarations();
  if (ws.notes.includes(Note.DETECTED_GOOGLE_DOCS)) {
    ws.cleanupHeadingStyles();
    ws.cleanupListItemStyles();
  }
  ws.normalizeLeftMargins();
  ws.normalizeFontWeights();
  ws.normalizeFontSizes();
  ws.removeEmptySpans();
  ws.handleWhitespaceBetweenParas();
  ws.convertStylesToBisu();
  ws.convertStylesToSupSub();
  ws.handleLeadingTrailingBisuWhitespace();
  ws.handleMonospaceFonts();
  ws.makeStylesInline();
  ws.removeUnneededSpans();
  return {
    html: processor.stringify(hast),
    notes: newNotes,
  };
}
