import unified from 'unified';
import rehypeParse from 'rehype-parse';
import utilVisit from 'unist-util-visit';
import hastClassList from 'hast-util-class-list';
import reduce from 'immer';
import parseUnit from 'parse-unit';

import rehypeParse5Stringify from '../processing/rehype-parse5-stringify';

import { getBodyContents } from '../processing/util';
import { hasClassName, extractStyleRuleWithProperty } from './util';

const processor = unified()
  .use(rehypeParse)
  .use(rehypeParse5Stringify);

function convertFontSizes(hast) {
  // 1.2em and larger get class font-big
  // 0.8em and smaller get class font-small
  utilVisit(hast, node => hasClassName(node, 'font-size'), (node) => {
    const ruleValue = extractStyleRuleWithProperty(node, 'font-size');
    if (ruleValue) {
      const strValue = parseUnit(ruleValue)[0];
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

const textAlignClasses = {
  right: 'align-right',
  center: 'align-center',
  justify: 'align-justify',
};

function convertTextAligns(hast) {
  utilVisit(hast, node => hasClassName(node, 'text-align'), (node) => {
    const ruleValue = extractStyleRuleWithProperty(node, 'text-align');
    if (ruleValue) {
      const classList = hastClassList(node);
      classList.remove('text-align');
      const newClass = textAlignClasses[ruleValue];
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
