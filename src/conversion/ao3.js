import unified from 'unified';
import rehypeParse from 'rehype-parse';
import utilVisit from 'unist-util-visit';
import hastClassList from 'hast-util-class-list';
import reduce from 'immer';
import parseUnit from 'parse-unit';
import css from 'css';

import rehypeParse5Stringify from '../processing/rehype-parse5-stringify';

import { getBodyContents, extractDirectivesAndValues } from '../processing/util';
import { hasClassName } from './util';

const processor = unified()
  .use(rehypeParse)
  .use(rehypeParse5Stringify);

const fontSizeRulePredicate = rule => rule.declarations[0].property === 'font-size';

function convertFontSizes(hast) {
  // 1.2em and larger get class font-big
  // 0.8em and smaller get class font-small
  utilVisit(hast, node => hasClassName(node, 'font-size'), (node) => {
    const parsed = css.parse(`div {${node.properties.style}}`);
    const fontSizeRule = parsed.stylesheet.rules.find(fontSizeRulePredicate);
    if (fontSizeRule) {
      parsed.stylesheet.rules = parsed.stylesheet.rules
        .filter(rule => !fontSizeRulePredicate(rule));
      const ruleString = css.stringify(parsed, { compress: true });
      // eslint-disable-next-line no-param-reassign
      node.properties.style = extractDirectivesAndValues(ruleString);
      if (node.properties.style.length === 0) {
        // eslint-disable-next-line no-param-reassign
        delete node.properties.style;
      }
      const strValue = parseUnit(fontSizeRule.declarations[0].value)[0];
      const numValue = parseFloat(strValue);
      const classList = hastClassList(node);
      classList.remove('font-size');
      if (numValue > 1.2) {
        classList.add('font-big');
      } else if (numValue < 0.8) {
        classList.add('font-small');
      }
    }
  });
}

const textAlignRulePredicate = rule => rule.declarations[0].property === 'text-align';
const textAlignClasses = {
  right: 'align-right',
  center: 'align-center',
  justify: 'align-justify',
};

function convertTextAligns(hast) {
  utilVisit(hast, node => hasClassName(node, 'text-align'), (node) => {
    const parsed = css.parse(`div {${node.properties.style}}`);
    const textAlignRule = parsed.stylesheet.rules.find(textAlignRulePredicate);
    if (textAlignRule) {
      parsed.stylesheet.rules = parsed.stylesheet.rules
        .filter(rule => !textAlignRulePredicate(rule));
      const ruleString = css.stringify(parsed, { compress: true });
      // eslint-disable-next-line no-param-reassign
      node.properties.style = extractDirectivesAndValues(ruleString);
      if (node.properties.style.length === 0) {
        // eslint-disable-next-line no-param-reassign
        delete node.properties.style;
      }
      const classList = hastClassList(node);
      classList.remove('text-align');
      const newClass = textAlignClasses[textAlignRule.declarations[0].value];
      if (newClass) {
        classList.add(newClass);
      }
    }
  });
}

export default function convert(html) {
  const docHast = processor.parse(html);
  const bodyContents = getBodyContents(docHast);
  const converted = reduce(bodyContents, (draftHast) => {
    convertFontSizes(draftHast);
    convertTextAligns(draftHast);
  });
  return processor.stringify(converted);
}
