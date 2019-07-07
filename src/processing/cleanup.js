import domPurify from 'dompurify';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import unified from 'unified';
import rehypeParse from 'rehype-parse';

import fixhtml from './fixhtml';
import cleanStyles from './styles';
import rehypeParse5Stringify from './rehype-parse5-stringify';
import { removeJunkFromHtml } from './removejunk';
import { rehypeDocumentSettings } from './util';

const domPurifyOptions = {
  FORBID_ATTR: ['dir'],
  WHOLE_DOCUMENT: true,
};

export function roundtripFormat(html) {
  // this currently exists for use in tests, but may have a non-test use in future
  // keep the processor structure in sync with makeFullDocument, except
  // not using rehype-document or fragment=true
  const processor = unified()
    .use(rehypeParse)
    .use(rehypeFormat)
    .use(rehypeParse5Stringify);
  return processor.processSync(html).contents;
}

function makeFullDocument(html) {
  const processor = unified()
    // Note to self: most invocations of rehypeParse should NOT use fragment=true
    // this will badly mangle complete doucuments,
    // but the output of cleanStyles() is always a fragment.
    .use(rehypeParse, { fragment: true })
    .use(rehypeDocument, rehypeDocumentSettings)
    .use(rehypeFormat)
    .use(rehypeParse5Stringify);
  return processor.processSync(html).contents;
}

export function cleanupRichText(html) {
  const validated = fixhtml(html);
  const cleanedHtml = domPurify.sanitize(validated.html, domPurifyOptions);
  const result = cleanStyles(cleanedHtml, validated.notes);
  const fullDocument = makeFullDocument(result.html);
  return {
    html: removeJunkFromHtml(fullDocument),
    notes: result.notes,
  };
}
