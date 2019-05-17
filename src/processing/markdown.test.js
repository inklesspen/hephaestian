import toDiffableHtml from 'diffable-html';

import utilFind from 'unist-util-find';
import isElement from 'hast-util-is-element';
import rehypeFormat from 'rehype-format';
import unified from 'unified';
import rehypeParse from 'rehype-parse';

import rehypeParse5Stringify from './rehype-parse5-stringify';
import { mdastToHast, processor } from './markdown';
import Note from './notes';

function narrowToBodyNode(hast) {
  const bodyNode = utilFind(hast, node => isElement(node, 'body'));
  if (bodyNode) {
    // eslint-disable-next-line no-param-reassign
    hast.children = [...bodyNode.children];
  }
  return hast;
}

function normalizeHtmlFormat(html) {
  // eslint-disable-next-line no-shadow
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeFormat)
    .use(rehypeParse5Stringify);
  return toDiffableHtml(processor.processSync(html).contents);
}

const sampleMarkdown = `
The chief mate of the Pequod was Starbuck, a native of Nantucket, and a Quaker
by descent. He was a long, earnest man, and though born on an icy coast, seemed
well adapted to endure hot latitudes, his flesh being hard as twice-baked
biscuit. Transported to the Indies, his live blood would not spoil like bottled
ale. He must have been born in some time of general drought and famine, or upon
one of those fast days for which his state is famous. Only some thirty arid
summers had he seen; those summers had dried up all his physical
superfluousness. But this, his thinness, so to speak, seemed no more the token
of wasting anxieties and cares, than it seemed the indication of any bodily
blight. It was merely the condensation of the man. He was by no means
ill-looking; quite the contrary. His pure tight skin was an excellent fit; and
closely wrapped up in it, and embalmed with inner health and strength, like a
revivified Egyptian, this _Starbuck_ **seemed** prepared to endure for long ages
to come, and to endure always, as now; for be it Polar snow or torrid sun, like
a patent chronometer, his interior vitality was warranted to do well in all
climates.

* * *

**Looking into his eyes,** _**you seemed to see there**_ **the yet lingering
images of those thousand-fold perils he had calmly confronted through life.** A
staid, steadfast man, whose life for the most part was a telling pantomime of
action, and not a tame chapter of sounds. Yet, for all his hardy sobriety and
fortitude, there were certain qualities in him which at times affected, and in
some cases seemed well nigh to overbalance all the rest. _Uncommonly
conscientious for a seaman,_ _**and endued with a deep natural reverence**_,
the wild watery loneliness of his life did therefore strongly incline him to
superstition_; but to that sort of superstition, which in some organizations
seems rather to spring, somehow, from intelligence than from ignorance. Outward
portents and inward presentiments were his.

> And if at times these things bent the welded iron of his soul, much more did
> his faraway domestic memories of his young Cape wife and child, tend to bend
> him still more from the original ruggedness of his nature, and open him still
> further to those latent influences which, in some honest-hearted men, restrain
> the gush of daredevil daring, so often evinced by others in the more perilous
> vicissitudes of the fishery. “I will have no man in my boat,” said Starbuck,
> “who is not afraid of a whale.” By this, he seemed to mean, not only that the
> most reliable and useful courage was that which arises from the fair
> estimation of the encountered peril, but that an utterly fearless man is a far
> more dangerous comrade than a coward.

Nevertheless, ~~ere long~~, the warm, _warbling persuasiveness_ of the pleasant,
holiday weather we came to, seemed gradually to charm him from his mood. For, as
when the red-cheeked, dancing girls, April and May, trip home to the wintry,
misanthropic woods; even the barest, ruggedest, most thunder-cloven old oak will
at least send forth some few green sprouts, to welcome such glad-hearted
visitants; so Ahab did, in the end, a little respond to the playful allurings of
that girlish air. More than once did he put forth the faint blossom of a look,
which, in any other man, would have soon flowered out in a smile.
`.trim();

const sampleMarkdownHtml = `
<p>
The chief mate of the Pequod was Starbuck, a native of Nantucket, and a Quaker
by descent. He was a long, earnest man, and though born on an icy coast, seemed
well adapted to endure hot latitudes, his flesh being hard as twice-baked
biscuit. Transported to the Indies, his live blood would not spoil like bottled
ale. He must have been born in some time of general drought and famine, or upon
one of those fast days for which his state is famous. Only some thirty arid
summers had he seen; those summers had dried up all his physical
superfluousness. But this, his thinness, so to speak, seemed no more the token
of wasting anxieties and cares, than it seemed the indication of any bodily
blight. It was merely the condensation of the man. He was by no means
ill-looking; quite the contrary. His pure tight skin was an excellent fit; and
closely wrapped up in it, and embalmed with inner health and strength, like a
revivified Egyptian, this <i>Starbuck</i> <b>seemed</b> prepared to endure for long ages
to come, and to endure always, as now; for be it Polar snow or torrid sun, like
a patent chronometer, his interior vitality was warranted to do well in all
climates.
</p>

<hr>

<p>
<b>Looking into his eyes,</b> <i><b>you seemed to see there</b></i> <b>the yet lingering
images of those thousand-fold perils he had calmly confronted through life.</b> A
staid, steadfast man, whose life for the most part was a telling pantomime of
action, and not a tame chapter of sounds. Yet, for all his hardy sobriety and
fortitude, there were certain qualities in him which at times affected, and in
some cases seemed well nigh to overbalance all the rest. <i>Uncommonly
conscientious for a seaman,</i> <i><b>and endued with a deep natural reverence</b></i>,
the wild watery loneliness of his life did therefore strongly incline him to
superstition_; but to that sort of superstition, which in some organizations
seems rather to spring, somehow, from intelligence than from ignorance. Outward
portents and inward presentiments were his.
</p>

<blockquote><p>
And if at times these things bent the welded iron of his soul, much more did
his faraway domestic memories of his young Cape wife and child, tend to bend
him still more from the original ruggedness of his nature, and open him still
further to those latent influences which, in some honest-hearted men, restrain
the gush of daredevil daring, so often evinced by others in the more perilous
vicissitudes of the fishery. “I will have no man in my boat,” said Starbuck,
“who is not afraid of a whale.” By this, he seemed to mean, not only that the
most reliable and useful courage was that which arises from the fair
estimation of the encountered peril, but that an utterly fearless man is a far
more dangerous comrade than a coward.
</p></blockquote>

<p>
Nevertheless, <s>ere long</s>, the warm, <i>warbling persuasiveness</i> of the pleasant,
holiday weather we came to, seemed gradually to charm him from his mood. For, as
when the red-cheeked, dancing girls, April and May, trip home to the wintry,
misanthropic woods; even the barest, ruggedest, most thunder-cloven old oak will
at least send forth some few green sprouts, to welcome such glad-hearted
visitants; so Ahab did, in the end, a little respond to the playful allurings of
that girlish air. More than once did he put forth the faint blossom of a look,
which, in any other man, would have soon flowered out in a smile.
</p>
`.trim();

describe('markdown processing', () => {
  it('should convert markdown to html documents', () => {
    const inputMdast = processor.parse(sampleMarkdown);
    const { hast, notes } = mdastToHast(inputMdast);
    expect(notes).toHaveLength(0);
    const body = narrowToBodyNode(hast);
    const html = processor.stringify(body);
    expect(normalizeHtmlFormat(html)).toEqual(normalizeHtmlFormat(sampleMarkdownHtml));
  });

  it('should warn about HTML embedded in markdown', () => {
    const inputMarkdown = 'here is <i>some</i> <b>html</b> to process';
    const inputMdast = processor.parse(inputMarkdown);
    const { hast, notes } = mdastToHast(inputMdast);
    expect(notes).toContain(Note.DETECTED_HTML_IN_MARKDOWN);
    const body = narrowToBodyNode(hast);
    const html = processor.stringify(body).trim();
    const expected = '<p>here is some html to process</p>';
    expect(html).toEqual(expected);
  });
});
