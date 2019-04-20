import domPurify from 'dompurify';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import unified from 'unified';
import rehypeParse from 'rehype-parse';

import fixhtml from './fixhtml';
import cleanStyles from './styles';
import rehypeParse5Stringify from './rehype-parse5-stringify';

const domPurifyOptions = {
  FORBID_ATTR: ['dir'],
};

function makeFullDocument(html) {
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeDocument, {
      title: 'Hephaestian document',
      meta: [{ name: 'generator', content: 'Hephaestian vUNKNOWN' }],
      responsive: false,
    })
    .use(rehypeFormat)
    .use(rehypeParse5Stringify);
  return processor.processSync(html).contents;
}

// eslint-disable-next-line import/prefer-default-export
export function cleanupRichText(html) {
  const validated = fixhtml(html);
  const cleanedHtml = domPurify.sanitize(validated.html, domPurifyOptions);
  const result = cleanStyles(cleanedHtml, validated.notes);
  return {
    html: makeFullDocument(result.html),
    notes: result.notes,
  };
}
