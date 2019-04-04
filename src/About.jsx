import React from 'react';

const body = (
  <div>
    <section>
      <h1>Hephaestian is...</h1>
      <p>
        Hephaestian is designed to process fanfic text for posting online.
        It accepts input primarily as copy-pasted rich text, and secondarily as Markdown.
      </p>
    </section>
    <section>
      <h1>What does Hephaestian accept</h1>
      <p>
        This tool is designed primarily to accept text copy-pasted from Google Docs.
        Scrivener and LibreOffice are also supported. When rich text is copy-pasted
        in a web browser, it actually produces HTML behind the scenes, but the HTML that
        Google Docs produces is not very good at expressing authorial intent. Hephaestian
        cleans up that HTML so that it can produce output tailored to specific sites&apos; needs.
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
      <h1>What formatting options does Hephaestian preserve?</h1>
      <ul>
        <li>Text alignment: left, center, or right</li>
        <li>Text formatting: bold, italic, underline, strikethru</li>
        <li>Headers</li>
        <li>Font sizes and colors (support may vary)</li>
        <li>Horizontal rules</li>
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
        <li>Use of colors other than plain black (#000000) will be incidental at most.</li>
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
  </div>
);

export default function About() {
  return body;
}

