<https://www.npmjs.com/package/fetch-fic>


# Header
Explanation of Hephaestian's purpose, bug report button, reset state button

# Welcome

Choose: paste rich text, paste markdown, upload html file, upload markdown file

# Textarea

For paste html or markdown. Paste in here, proceed to Squire

# File upload

Upload here, proceed to Squire

# Squire

Side-effect store raw pasted HTML in React state (during sanitizeToDOMFragment call), for debugging purposes?

Paste rich text.

# Rich Text Preview

Resolve cross-platform problems (such as colored text, links, etc).

# Export

ffnet-optimized HTML, ao3-optimized HTML, SB/SV-optimized bbcode, SA-optimized bbcode, Markdown, Discord Markdown blocks, Hephaestian-optimized HTML (for later re-import, use <meta name="generator" content="Hephaestian 1.0.1">), or all as zip file

standalone web page format, with TOC for headers? might be nice for PCT exchanges

https://github.com/webpack/webpack/issues/237#issuecomment-342129128

Use rehype/remark for HTML/Markdown manipulation.
https://www.npmjs.com/package/rehype-react
https://github.com/rehypejs/rehype-format
https://www.npmjs.com/package/rehype-sanitize
https://www.npmjs.com/package/remark-stringify
https://github.com/rehypejs/rehype-remark

https://www.npmjs.com/package/hast-util-from-parse5
https://www.npmjs.com/package/hast-util-to-parse5

https://github.com/jxnblk/closest-color-keyword/blob/master/index.js
in combination with https://www.npmjs.com/package/color-string and https://www.npmjs.com/package/color-diff

https://archiveofourown.org/skins/229 has the colors allowed

https://redux-starter-kit.js.org/introduction/quick-start
https://github.com/redux-saga/redux-saga
https://reacttraining.com/react-router/web/guides/redux-integration
use memoryrouter

font-size: ffnet will ignore, ao3 only offers .font-big for 120% of normal and .font-small for 80% of normal
forums: sb/sv support 1-7 where 4 is approximately 'normal'; 4 is 15px while normal is 16px and 5 is 18px
 - use this to replace h1/h2/h3
 - full set: 9, 10, 12, 15, 18, 22, 26
SA only supports sizes in custom titles so forget about it.

we're not supporting font size keywords, but if we were, https://drafts.csswg.org/css-fonts-3/#font-size-prop has helpful data

TODO: migrate to neutrino 9 and/or away from neutrino
then use git-revision-webpack-plugin and https://webpack.js.org/loaders/val-loader

<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;border-bottom:solid #000000 0.75pt;">&nbsp;</p>
for some reason this weird excuse for a <hr> was in a gdoc
