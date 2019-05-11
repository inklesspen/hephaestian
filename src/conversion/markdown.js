import unified from 'unified';
import u from 'unist-builder';
import rehypeParse from 'rehype-parse';
import rehypeToRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';

import { getBodyContents } from '../processing/util';

const processor = unified()
  .use(rehypeParse)
  .use(rehypeToRemark)
  .use(remarkStringify);

export default function convert(html) {
  const docHast = processor.parse(html);
  const bodyContents = getBodyContents(docHast);
  const converted = processor.runSync(bodyContents);
  return processor.stringify(converted);
}

const MAX_CHARS = 1980;
const STARTER = '```markdown\n';
const ENDER = '\n```';

function makeBlock(builder) {
  return (STARTER + processor.stringify(builder).trim() + ENDER);
}

// TODO: write some tests for this
function makeCodeBlocks(mdast) {
  const blocks = [];
  let builder = null;
  while (mdast.children.length > 0) {
    if (builder === null) {
      builder = u('root', []);
    }
    builder.children.push(mdast.children.shift());
    if (makeBlock(builder).length >= MAX_CHARS) {
      mdast.children.unshift(builder.children.pop());
      blocks.push(makeBlock(builder));
      builder = null;
    }
  }
  blocks.push(makeBlock(builder));
  return blocks.join('\n\n');
}

export function convertForDiscord(html) {
  const docHast = processor.parse(html);
  const bodyContents = getBodyContents(docHast);
  const converted = processor.runSync(bodyContents);
  return makeCodeBlocks(converted);
}
