import domPurify from 'dompurify';

import fixhtml from './fixhtml';
import cleanStyles from './styles';

const domPurifyOptions = {
  FORBID_ATTR: ['dir'],
};

// eslint-disable-next-line import/prefer-default-export
export function cleanupRichText(html) {
  const validated = fixhtml(html);
  const cleanedHtml = domPurify.sanitize(validated.html, domPurifyOptions);
  const result = cleanStyles(cleanedHtml, validated.notes);
  return result;
}
