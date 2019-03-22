import unified from 'unified';
import rehypeDomParse from 'rehype-dom-parse';
import rehypeDomStringify from 'rehype-dom-stringify';
import remarkParse from 'remark-parse';
import remarkToRehype from 'remark-rehype';
// import remarkStringify from 'remark-stringify';
// import utilIs from 'unist-util-is';
// import utilVisit from 'unist-util-visit';
// import hastscript from 'hastscript';
// import produce from 'immer';
// import utilInspect from 'unist-util-inspect';

export function processHtml(html) {
  const processor = unified()
    .use(rehypeDomParse)
    .use(rehypeDomStringify, { fragment: true });
  return processor.processSync(html);
}

export function processMarkdown(markdown) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkToRehype)
    .use(rehypeDomStringify, { fragment: true });
  return processor.processSync(markdown);
}
