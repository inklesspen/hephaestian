import hasProperty from 'hast-util-has-property';
import css from 'css';

import { extractDirectivesAndValues } from '../processing/util';

export function hasClassName(node, className) {
  return hasProperty(node, 'className') && node.properties.className.includes(className);
}

export function extractStyleRuleWithProperty(node, property) {
  const parsed = css.parse(`div {${node.properties.style}}`);
  const rulePredicate = rule => rule.declarations[0].property === property;
  const foundRule = parsed.stylesheet.rules.find(rulePredicate);
  if (foundRule) {
    parsed.stylesheet.rules = parsed.stylesheet.rules
      .filter(rule => !rulePredicate(rule));
    const ruleString = css.stringify(parsed, { compress: true });
    const newStyleText = extractDirectivesAndValues(ruleString);
    // eslint-disable-next-line no-param-reassign
    node.properties.style = newStyleText;
    if (node.properties.style.length === 0) {
      // eslint-disable-next-line no-param-reassign
      delete node.properties.style;
    }

    const foundValue = foundRule.declarations[0].value;
    return foundValue;
  }
  return null;
}
