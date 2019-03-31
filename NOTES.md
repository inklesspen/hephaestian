<https://www.npmjs.com/package/fetch-fic>

https://summernote.org/ preserves all copy-pasted formatting, but doesn't clean the HTML.
latest http://neilj.github.io/Squire/ handles almost everything, but loses strikethru and adds extra blank paragraphs after horizontal rules
Quill will likely be very good once 2.0 is released, but until then....

TODO: Detect <div><hr><br></div> in Squire phase and show notice about it.


# Header
Explanation of Hephaestian's purpose, bug report button, reset state button

# Welcome

Choose: paste rich text, paste html, paste markdown, upload html file, upload markdown file

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

ffnet-optimized HTML, ao3-optimized HTML, SB/SV-optimized bbcode, SA-optimized bbcode, Markdown, Discord Markdown blocks, Hephaestian-optimized HTML (for later re-import), or all as zip file


Use rehype/remark for HTML/Markdown manipulation.
https://www.npmjs.com/package/rehype-react
https://github.com/rehypejs/rehype-format
https://www.npmjs.com/package/rehype-sanitize
https://www.npmjs.com/package/remark-stringify
https://github.com/rehypejs/rehype-remark

https://github.com/jxnblk/closest-color-keyword/blob/master/index.js
in combination with https://www.npmjs.com/package/color-string and https://www.npmjs.com/package/color-diff

https://archiveofourown.org/skins/229 has the colors allowed

TODO: need to detect styling applied to the entire text (or almost all), change it to be a default, and remove it

https://redux-starter-kit.js.org/introduction/quick-start
https://github.com/redux-saga/redux-saga
https://reacttraining.com/react-router/web/guides/redux-integration
use memoryrouter

font-size: ffnet will ignore, ao3 only offers .font-big for 120% of normal and .font-small for 80% of normal
forums: sb/sv support 1-7 where 4 is approximately 'normal'; 4 is 15px while normal is 16px and 5 is 18px
 - use this to replace h1/h2/h3
 - full set: 9, 10, 12, 15, 18, 22, 26
SA only supports sizes in custom titles so forget about it.