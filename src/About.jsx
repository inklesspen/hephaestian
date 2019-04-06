import React from 'react';

const body = (
  <div>
    <section>
      <h1>Hephaestian is&hellip;</h1>
      <p>
        Hephaestian is designed to process fanfic text for posting online.
        It accepts input primarily as copy-pasted rich text, and secondarily as Markdown.
      </p>
    </section>
    <section>
      <h1>What does Hephaestian accept</h1>
      <p>
        This tool is designed primarily to accept text copy-pasted from Google Docs.
        Scrivener (Mac and iOS only) and LibreOffice are also supported.
        When rich text is copy-pasted in a web browser, it actually produces HTML behind the
        scenes, but the HTML that Google Docs produces is not very good at expressing authorial
        intent. Hephaestian cleans up that HTML so that it can produce output tailored to
        specific sites&apos; needs.
      </p>
    </section>
    <section>
      <h1>What output formats does Hephaestian produce?</h1>
      <dl>
        <dt>Fanfiction.net</dt>
        <dd>site-tuned HTML (Fanfiction.net does not support font sizes, links, or color)</dd>
        <dt>Archiveofourown.org</dt>
        <dd>site-tuned HTML (AO3 supports sizes and colors via classes provided by work skins)</dd>
        <dt>SpaceBattles/SufficientVelocity</dt><dd>BBCode</dd>
        <dt>Other</dt>
        <dd>
          Hephaestian will also convert your text into Markdown format, as well as
          provide an optimized HTML file which can be loaded back into Hephaestian.
        </dd>
      </dl>
    </section>
    <section>
      <h1>What formatting options does Hephaestian try to preserve?</h1>
      <ul>
        <li>Text alignment: left, center, or right</li>
        <li>Text formatting: bold, italic, underline, strikethru</li>
        <li>Headers</li>
        <li>Font sizes</li>
        <li>Font family/face (limited)</li>
        <li>Horizontal rules</li>
      </ul>
    </section>
    <section>
      <h1>What&apos;s &quot;limited&quot; about the font family support?</h1>
      <p>
        The only font family Hephaestian preserves are monospaced fonts. If you use
        a monospaced font, such as Courier, Monaco, or Consolas, Hephaestian will
        attempt to render it as a &quot;code&quot; block in the output.
        However, Hephaestian may not always recognize a monospaced font by its name.
        If you have difficulty with this feature, make sure your monospaced font
        is one of these fonts:
      </p>
      <ul>
        <li>Courier or Courier New</li>
        <li>Consolas</li>
        <li>Monaco</li>
        <li>
          &hellip; or any other font with the word &quot;Mono&quot; in its name,
          such as &quot;Fira Mono&quot; or &quot;Roboto Mono&quot;.
        </li>
      </ul>
    </section>
    <section>
      <h1>What assumptions does Hephaestian make?</h1>
      <p>
        When rich text is copy-pasted in a web browser, it actually produces HTML behind the scenes.
        Hephaestian makes certain assumptions about this HTML.
      </p>
      <ul>
        <li>The bulk of the body text is in normal font style, rather than bold or italic.</li>
        <li>Paragraphs either always have a blank line separating them, or never do.</li>
        <li>
          All measurements (margins, font sizes, etc) will use the same units, at least
          within a class of measurement, rather than mixing different units.
        </li>
      </ul>
      <p>
        If a rich text provider violates these assumptions, bad output may result.
        If this causes problems, contact me.
      </p>
    </section>
    <section>
      <h1>Wait, how come I can&apos;t copy-paste from Scrivener on Windows?</h1>
      <p>
        Well, I mean you <i>can</i>. It just won&apos;t do what you want.
        Scrivener for Windows does not copy rich text in a format that can be
        understood by a web browser, which results in the loss of all formatting.
      </p>
      <p>
        As a workaround, copy-pasting from Scrivener into a new LibreOffice doc,
        then copy-pasting from LibreOffice into Hephaestian, preserves formatting.
      </p>
    </section>
  </div>
);

export default function About() {
  return body;
}

