import hscript from 'hastscript';
import uscript from 'unist-builder';
import { LoremIpsum } from 'lorem-ipsum';

import cleanStyles, { cssScript, StyleWorkspace } from './styles';
import Note from './notes';

const lorem = new LoremIpsum();

describe('integration tests', () => {
  function loadTestFixtures(path) {
    /* eslint-disable global-require, import/no-unresolved */
    /* eslint-disable import/no-webpack-loader-syntax, import/no-dynamic-require */
    const before = require(`./testsamples/styles/before/${path}.rawhtml`);
    const after = require(`./testsamples/styles/after/${path}.rawhtml`);
    /* eslint-enable global-require, import/no-unresolved */
    /* eslint-enable import/no-webpack-loader-syntax, import/no-dynamic-require */
    return { before, after };
  }

  it('should handle bisu in macos rich text', () => {
    const { before, after } = loadTestFixtures('macos-bisu');
    const { html: processed, notes: processedNotes } = cleanStyles(before, [Note.DETECTED_MACOS]);
    expect(processed).toEqual(after);
    expect(processedNotes).toContain(Note.DETECTED_MACOS);
  });
});

describe('StyleWorkspace', () => {
  it('should convert inline styles to class selector styles', () => {
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('span', { style: 'color:#000000;font-family:Arial;font-size:11pt;font-style:normal;font-weight:400;text-decoration:none;' }, 'Normal text '),
        hscript('span', { style: 'color:#000000;font-family:Arial;font-size:11pt;font-style:normal;font-weight:700;text-decoration:none;' }, 'bold now'),
        hscript('span', { style: 'color:#000000;font-family:Arial;font-size:11pt;font-style:normal;font-weight:400;text-decoration:none;' }, '.'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    const expected = uscript('root', [
      hscript('div', [
        hscript('span', { class: 'hephaestian-style-1' }, 'Normal text '),
        hscript('span', { class: 'hephaestian-style-2' }, 'bold now'),
        hscript('span', { class: 'hephaestian-style-1' }, '.'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expected);
    const expectedRules = [
      cssScript.rmulti('.hephaestian-style-1', [
        cssScript.d('color', '#000000'),
        cssScript.d('font-family', 'Arial'),
        cssScript.d('font-size', '11pt'),
        cssScript.d('font-style', 'normal'),
        cssScript.d('font-weight', '400'),
        cssScript.d('text-decoration', 'none'),
      ]),
      cssScript.rmulti('.hephaestian-style-2', [
        cssScript.d('color', '#000000'),
        cssScript.d('font-family', 'Arial'),
        cssScript.d('font-size', '11pt'),
        cssScript.d('font-style', 'normal'),
        cssScript.d('font-weight', '700'),
        cssScript.d('text-decoration', 'none'),
      ]),
    ];
    expect(workspace.styleMap.rules).toEqual(expectedRules);
  });

  it('should convert multi-declaration rules in the stylemap to single-declaration form', () => {
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('span', { class: 'hephaestian-style-1' }, 'Normal text '),
        hscript('span', { class: 'hephaestian-style-2' }, 'bold now'),
        hscript('span', { class: 'hephaestian-style-1' }, '.'),
      ]),
    ]);
    const inputRules = [
      cssScript.rmulti('.hephaestian-style-1', [
        cssScript.d('color', '#000000'),
        cssScript.d('font-family', 'Arial'),
        cssScript.d('font-size', '11pt'),
        cssScript.d('font-style', 'normal'),
        cssScript.d('font-weight', '400'),
        cssScript.d('text-decoration', 'none'),
      ]),
      cssScript.rmulti('.hephaestian-style-2', [
        cssScript.d('color', '#000000'),
        cssScript.d('font-family', 'Arial'),
        cssScript.d('font-size', '11pt'),
        cssScript.d('font-style', 'normal'),
        cssScript.d('font-weight', '700'),
        cssScript.d('text-decoration', 'none'),
      ]),
    ];
    const workspace = new StyleWorkspace(inputHast);
    workspace.styleMap.stylesheetContainer.stylesheet.rules.push(...inputRules);
    workspace.styleMap.classNameCounter = inputRules.length;

    workspace.makeSingleDeclarationSingleClassForm();
    const expected = uscript('root', [
      hscript('div', [
        hscript('span', { class: 'hephaestian-style-3 hephaestian-style-4 hephaestian-style-5 hephaestian-style-6 hephaestian-style-7 hephaestian-style-8' }, 'Normal text '),
        hscript('span', { class: 'hephaestian-style-3 hephaestian-style-4 hephaestian-style-5 hephaestian-style-6 hephaestian-style-9 hephaestian-style-8' }, 'bold now'),
        hscript('span', { class: 'hephaestian-style-3 hephaestian-style-4 hephaestian-style-5 hephaestian-style-6 hephaestian-style-7 hephaestian-style-8' }, '.'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expected);
    const expectedRules = [
      cssScript.r('.hephaestian-style-3', cssScript.d('color', '#000000')),
      cssScript.r('.hephaestian-style-4', cssScript.d('font-family', 'Arial')),
      cssScript.r('.hephaestian-style-5', cssScript.d('font-size', '11pt')),
      cssScript.r('.hephaestian-style-6', cssScript.d('font-style', 'normal')),
      cssScript.r('.hephaestian-style-7', cssScript.d('font-weight', '400')),
      cssScript.r('.hephaestian-style-8', cssScript.d('text-decoration', 'none')),
      cssScript.r('.hephaestian-style-9', cssScript.d('font-weight', '700')),
    ];
    expect(workspace.styleMap.rules).toEqual(expectedRules);
    expect(workspace.notes).not.toContain(Note.PROCESSED_STYLESHEET);
  });

  it('should convert multi-declaration rules in style elements to single-declaration form', () => {
    const inputHast = uscript('root', [
      hscript('html', [
        hscript('head', [
          hscript('style', { type: 'text/css' }, 'p.p1{font-family:"Palatino";font-size:18.0px;margin-left:0.0px;margin-right:0.0px;}p.p2{font-family:"Palatino";font-size:13.0px;margin-left:0.0px;margin-right:0.0px;}p.p3{font-family:"Palatino";font-size:13.0px;margin-left:0.0px;margin-right:0.0px;}'),
        ]),
        hscript('body', [
          hscript('p.p1', hscript('b', 'My Heading')),
          hscript('p.p2', 'Some body text'),
          hscript('p.p3', hscript('br')),
          hscript('p.p2', 'More body text'),
        ]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.makeSingleDeclarationSingleClassForm();
    const expectedHast = uscript('root', [
      hscript('html', [
        hscript('head'),
        hscript('body', [
          hscript('p', { class: 'hephaestian-style-1 hephaestian-style-2 hephaestian-style-3 hephaestian-style-4' }, hscript('b', 'My Heading')),
          hscript('p', { class: 'hephaestian-style-1 hephaestian-style-5 hephaestian-style-3 hephaestian-style-4' }, 'Some body text'),
          hscript('p', { class: 'hephaestian-style-1 hephaestian-style-5 hephaestian-style-3 hephaestian-style-4' }, hscript('br')),
          hscript('p', { class: 'hephaestian-style-1 hephaestian-style-5 hephaestian-style-3 hephaestian-style-4' }, 'More body text'),
        ]),
      ]),
    ]);
    const expectedRules = [
      cssScript.r('.hephaestian-style-1', cssScript.d('font-family', '"Palatino"')),
      cssScript.r('.hephaestian-style-2', cssScript.d('font-size', '18.0px')),
      cssScript.r('.hephaestian-style-3', cssScript.d('margin-left', '0.0px')),
      cssScript.r('.hephaestian-style-4', cssScript.d('margin-right', '0.0px')),
      cssScript.r('.hephaestian-style-5', cssScript.d('font-size', '13.0px')),
    ];
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.styleMap.rules).toEqual(expectedRules);
    expect(workspace.notes).toContain(Note.PROCESSED_STYLESHEET);
  });

  it('should convert bisu nodes to styles', () => {
    const inputHast = uscript('root', [
      hscript('p', [hscript('b', 'Something bold')]),
      hscript('p', [hscript('i', 'Something italic')]),
      hscript('p', [hscript('b', hscript('i', 'Something bold/italic'))]),
      hscript('div', [
        hscript('span', [
          'Normal text ',
          hscript('u', 'underlined'),
          ' ',
          hscript('s', 'strikethru'),
        ]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.convertBisuToStyles();
    const expectedHast = uscript('root', [
      hscript('p', [hscript('span.hephaestian-style-1', 'Something bold')]),
      hscript('p', [hscript('span.hephaestian-style-2', 'Something italic')]),
      hscript('p', [hscript('span.hephaestian-style-1', hscript('span.hephaestian-style-2', 'Something bold/italic'))]),
      hscript('div', [
        hscript('span', [
          'Normal text ',
          hscript('span.hephaestian-style-3', 'underlined'),
          ' ',
          hscript('span.hephaestian-style-4', 'strikethru'),
        ]),
      ]),
    ]);
    const expectedRules = [
      cssScript.r('.hephaestian-style-1', cssScript.d('font-weight', 'bold')),
      cssScript.r('.hephaestian-style-2', cssScript.d('font-style', 'italic')),
      cssScript.r('.hephaestian-style-3', cssScript.d('text-decoration', 'underline')),
      cssScript.r('.hephaestian-style-4', cssScript.d('text-decoration', 'line-through')),
    ];
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.styleMap.rules).toEqual(expectedRules);
  });

  it('should convert bisu styles back to nodes', () => {
    const inputHast = uscript('root', [
      hscript('p', [hscript('span.hephaestian-style-1', 'Something bold')]),
      hscript('p', [hscript('span.hephaestian-style-2', 'Something italic')]),
      hscript('p', [hscript('span.hephaestian-style-1', hscript('span.hephaestian-style-2', 'Something bold/italic'))]),
      hscript('div', [
        hscript('span', [
          'Normal text ',
          hscript('span.hephaestian-style-3', 'underlined'),
          ' ',
          hscript('span.hephaestian-style-4', 'strikethru'),
        ]),
      ]),
    ]);
    const inputRules = [
      cssScript.r('.hephaestian-style-1', cssScript.d('font-weight', 'bold')),
      cssScript.r('.hephaestian-style-2', cssScript.d('font-style', 'italic')),
      cssScript.r('.hephaestian-style-3', cssScript.d('text-decoration', 'underline')),
      cssScript.r('.hephaestian-style-4', cssScript.d('text-decoration', 'line-through')),
    ];
    const workspace = new StyleWorkspace(inputHast);
    workspace.styleMap.stylesheetContainer.stylesheet.rules.push(...inputRules);
    workspace.styleMap.classNameCounter = inputRules.length;

    workspace.convertStylesToBisu();
    const expectedHast = uscript('root', [
      hscript('p', [hscript('span', { class: '' }, hscript('b', 'Something bold'))]),
      hscript('p', [hscript('span', { class: '' }, hscript('i', 'Something italic'))]),
      hscript('p', [hscript('span', { class: '' }, hscript('b', hscript('span', { class: '' }, hscript('i', 'Something bold/italic'))))]),
      hscript('div', [
        hscript('span', [
          'Normal text ',
          hscript('span', { class: '' }, hscript('u', 'underlined')),
          ' ',
          hscript('span', { class: '' }, hscript('s', 'strikethru')),
        ]),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.styleMap.rules).toEqual([]);
  });

  it('should expand shortcut properties', () => {
    const fontProperty = 'font: italic 1.2em "Fira Sans", serif;';
    const marginProperty = 'margin: 10px 50px 20px;';
    const inputHast = uscript('root', [
      hscript('html', [
        hscript('head', [
          hscript('style', { type: 'text/css' }, `p.p1{${fontProperty}}`),
        ]),
        hscript('body', [
          hscript('p.p1', 'Some body text'),
          hscript('p', hscript('br')),
          hscript('p', hscript('span', { style: marginProperty }, 'More body text')),
        ]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();
    const expectedHast = uscript('root', [
      hscript('html', [
        hscript('head'),
        hscript('body', [
          hscript('p', { class: 'hephaestian-style-6 hephaestian-style-7 hephaestian-style-8' }, 'Some body text'),
          hscript('p', hscript('br')),
          hscript('p', hscript('span', { class: 'hephaestian-style-2 hephaestian-style-3 hephaestian-style-4 hephaestian-style-5' }, 'More body text')),
        ]),
      ]),
    ]);
    const expectedRules = [
      cssScript.r('.hephaestian-style-2', cssScript.d('margin-top', '10px')),
      cssScript.r('.hephaestian-style-3', cssScript.d('margin-right', '50px')),
      cssScript.r('.hephaestian-style-4', cssScript.d('margin-bottom', '20px')),
      cssScript.r('.hephaestian-style-5', cssScript.d('margin-left', '50px')),
      cssScript.r('.hephaestian-style-6', cssScript.d('font-family', '"Fira Sans", serif')),
      cssScript.r('.hephaestian-style-7', cssScript.d('font-style', 'italic')),
      cssScript.r('.hephaestian-style-8', cssScript.d('font-size', '1.2em')),
    ];
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.styleMap.rules).toEqual(expectedRules);
  });

  it('should filter out unneeded styles', () => {
    const inputHast = uscript('root', [
      hscript('div'),
    ]);
    const inputStyles = [
      'line-height: 1.38',
      'margin-top: 0pt',
      'margin-bottom: 0pt',
      'text-indent: 36pt',
      'font-size: 11pt',
      'font-family: Arial',
      'color: #000000',
      'background-color: transparent',
      'font-weight: 400',
      'font-style: normal',
      'font-variant: normal',
      'text-decoration: none',
      'vertical-align: baseline',
      'white-space: pre',
      'white-space: pre-wrap',
      'vertical-align: super',
      'vertical-align: sub',
    ];
    const workspace = new StyleWorkspace(inputHast);
    inputStyles.forEach(s => workspace.styleMap.addStyle(s));
    expect(workspace.styleMap.classNameCounter).toEqual(inputStyles.length);

    workspace.filterStyleDeclarations();
    const expectedRules = [
      cssScript.r('.hephaestian-style-5', cssScript.d('font-size', '11pt')),
      cssScript.r('.hephaestian-style-6', cssScript.d('font-family', 'Arial')),
      cssScript.r('.hephaestian-style-9', cssScript.d('font-weight', '400')),
      cssScript.r('.hephaestian-style-10', cssScript.d('font-style', 'normal')),
      cssScript.r('.hephaestian-style-12', cssScript.d('text-decoration', 'none')),
      cssScript.r('.hephaestian-style-16', cssScript.d('vertical-align', 'super')),
      cssScript.r('.hephaestian-style-17', cssScript.d('vertical-align', 'sub')),
    ];
    expect(workspace.styleMap.rules).toEqual(expectedRules);
  });

  it('should narrow to body node', () => {
    const inputHast = uscript('root', [
      hscript('html', [
        hscript('head', [
          hscript('title', 'Boring stuff'),
        ]),
        hscript('body', [
          hscript('p', 'Some body text'),
          hscript('p', hscript('br')),
          hscript('p', hscript('span', 'More body text')),
        ]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.narrowToBodyNode();
    const expectedHast = uscript('root', [
      hscript('p', 'Some body text'),
      hscript('p', hscript('br')),
      hscript('p', hscript('span', 'More body text')),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.NARROWED_TO_BODY);
  });

  it('should leave the tree alone when no body node', () => {
    const inputHast = uscript('root', [
      hscript('p', 'Some body text'),
      hscript('p', hscript('br')),
      hscript('p', hscript('span', 'More body text')),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.narrowToBodyNode();
    expect(workspace.hast).toEqual(inputHast);
    expect(workspace.notes).not.toContain(Note.NARROWED_TO_BODY);
  });

  it('should normalize gdocs-style margins', () => {
    const texts = [1, 2, 3, 4, 5, 6, 7].map(() => lorem.generateParagraphs(1));
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('p', [
          hscript('span', texts[0]),
        ]),
        hscript('p', [
          hscript('span', texts[1]),
        ]),
        hscript('p', [
          hscript('span', texts[2]),
        ]),
        hscript('p', { class: 'hephaestian-style-1' }, [
          hscript('span', texts[3]),
        ]),
        hscript('p', { class: 'hephaestian-style-1' }, [
          hscript('span', texts[4]),
        ]),
        hscript('p', [
          hscript('span', texts[5]),
        ]),
        hscript('p', [
          hscript('span', texts[6]),
        ]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.styleMap.addStyle('margin-left: 72pt');

    workspace.normalizeLeftMargins();
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('p', [
          hscript('span', texts[0]),
        ]),
        hscript('p', [
          hscript('span', texts[1]),
        ]),
        hscript('p', [
          hscript('span', texts[2]),
        ]),
        hscript('blockquote', { class: '' }, [
          hscript('span', texts[3]),
        ]),
        hscript('blockquote', { class: '' }, [
          hscript('span', texts[4]),
        ]),
        hscript('p', [
          hscript('span', texts[5]),
        ]),
        hscript('p', [
          hscript('span', texts[6]),
        ]),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.styleMap.rules).toEqual([]);
  });

  it('should normalize scrivener-style margins', () => {
    // using the same text for every paragraph so we can be sure to trigger the 75% threshold
    const text = lorem.generateParagraphs(1);
    const inputHast = uscript('root', [
      hscript('p', { class: 'hephaestian-style-1' }, text),
      hscript('p', { class: 'hephaestian-style-1' }, text),
      hscript('p', { class: 'hephaestian-style-1' }, text),
      hscript('p', { class: 'hephaestian-style-1' }, text),
      hscript('p', { class: 'hephaestian-style-2' }, text),
      hscript('p', { class: 'hephaestian-style-2' }, text),
      hscript('p', { class: 'hephaestian-style-1' }, text),
      hscript('p', { class: 'hephaestian-style-1' }, text),
      hscript('p', { class: 'hephaestian-style-1' }, text),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.styleMap.addStyle('margin-left: 0.0px');
    workspace.styleMap.addStyle('margin-left: 36.0px');

    workspace.normalizeLeftMargins();
    const expectedHast = uscript('root', [
      hscript('p', { class: '' }, text),
      hscript('p', { class: '' }, text),
      hscript('p', { class: '' }, text),
      hscript('p', { class: '' }, text),
      hscript('blockquote', { class: '' }, text),
      hscript('blockquote', { class: '' }, text),
      hscript('p', { class: '' }, text),
      hscript('p', { class: '' }, text),
      hscript('p', { class: '' }, text),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.styleMap.rules).toEqual([]);
  });

  it('should normalize font-weights', () => {
    const texts = [1, 2, 3, 4, 5, 6, 7, 8].map(() => lorem.generateParagraphs(1));
    const inputHast = uscript('root', [
      hscript('p', { class: 'hephaestian-style-1' }, texts[0]),
      hscript('p', { class: 'hephaestian-style-2' }, texts[1]),
      hscript('p', { class: 'hephaestian-style-3' }, texts[2]),
      hscript('p', { class: 'hephaestian-style-4' }, texts[3]),
      hscript('p', { class: 'hephaestian-style-5' }, texts[4]),
      hscript('p', { class: 'hephaestian-style-2' }, texts[5]),
      hscript('p', { class: 'hephaestian-style-6' }, texts[6]),
      hscript('p', { class: 'hephaestian-style-7' }, texts[7]),
    ]);
    const inputStyles = [
      'font-weight: normal', 'font-weight: bold', 'font-weight: 300',
      'font-weight: 400', 'font-weight: 600', 'font-weight: 800', 'font-weight: 900',
    ];
    const workspace = new StyleWorkspace(inputHast);
    inputStyles.forEach(s => workspace.styleMap.addStyle(s));
    expect(workspace.styleMap.classNameCounter).toEqual(inputStyles.length);

    workspace.normalizeFontWeights();
    const expectedHast = uscript('root', [
      hscript('p', { class: 'hephaestian-style-8' }, texts[0]),
      hscript('p', { class: 'hephaestian-style-9' }, texts[1]),
      hscript('p', { class: 'hephaestian-style-8' }, texts[2]),
      hscript('p', { class: 'hephaestian-style-8' }, texts[3]),
      hscript('p', { class: 'hephaestian-style-9' }, texts[4]),
      hscript('p', { class: 'hephaestian-style-9' }, texts[5]),
      hscript('p', { class: 'hephaestian-style-9' }, texts[6]),
      hscript('p', { class: 'hephaestian-style-9' }, texts[7]),
    ]);
    const expectedRules = [
      cssScript.r('.hephaestian-style-8', cssScript.d('font-weight', 'normal')),
      cssScript.r('.hephaestian-style-9', cssScript.d('font-weight', 'bold')),
    ];
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.styleMap.rules).toEqual(expectedRules);
  });

  it('should cleanup heading styles', () => {
    // gdocs headings use both h1/h2/h3 and font stylings;
    // so remove certain font styles inside headings
    // the styles are on nodes _inside_ the heading nodes
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('h1', hscript('span', { style: 'font-size: 20px' }, 'First Header')),
        hscript('h2', hscript('span', { style: 'font-weight: 700' }, 'Second Header')),
        hscript('h3', hscript('span', { style: 'font-style: normal' }, 'Third Header')),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();
    expect(workspace.styleMap.rules.length).toEqual(3);

    workspace.cleanupHeadingStyles();
    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('h1', hscript('span', 'First Header')),
        hscript('h2', hscript('span', 'Second Header')),
        hscript('h3', hscript('span', 'Third Header')),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should clean up listitem styles', () => {
    // gdocs puts margin-left on <li> tags; this throws off normalizeLeftMargins
    const inputHast = uscript('root', [
      hscript('ol', [
        hscript('li', { style: 'margin-left: 15px' }, 'Number One'),
        hscript('li', { style: 'margin-left: 15px' }, 'Number Two'),
        hscript('li', { style: 'margin-left: 15px' }, 'Number Three'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();
    expect(workspace.styleMap.rules.length).toEqual(1);

    workspace.cleanupListItemStyles();
    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('ol', [
        hscript('li', 'Number One'),
        hscript('li', 'Number Two'),
        hscript('li', 'Number Three'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should convert superscript and subscript styles to nodes', () => {
    // vertical-align: super, vertical-align: sub
    // remove font-size style on these also
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('span', { style: 'font-family:serif;font-size:6.6pt;vertical-align:super;' }, 'superscript'),
        hscript('span', { style: 'font-family:serif;font-size:6.6pt;vertical-align:sub;' }, 'subscript'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();
    expect(workspace.styleMap.rules.length).toEqual(4);

    workspace.convertStylesToSupSub();
    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('span', hscript('sup', 'superscript')),
        hscript('span', hscript('sub', 'subscript')),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should normalize font sizes given in px', () => {
    const inputHast = uscript('root', [
      hscript('html', [
        hscript('head', [
          hscript('style', { type: 'text/css' }, 'p.p1 {font-size: 12.0px;}span.s1 {font-size: 18.0px;}span.s2 {font-size: 9.0px}'),
        ]),
        hscript('body', [
          hscript('p.p1', [
            hscript('span', 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read. On the left was a big button that read ['),
            hscript('span.s1', 'INITIATE HACK'),
            hscript('span', '], with another, smaller, button reading ['),
            hscript('span.s2', 'CANCEL'),
            hscript('span', '].'),
          ]),
        ]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();
    workspace.narrowToBodyNode();

    workspace.normalizeFontSizes();
    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('span', 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read. On the left was a big button that read ['),
        hscript('span.font-size', { style: 'font-size:1.5em;' }, 'INITIATE HACK'),
        hscript('span', '], with another, smaller, button reading ['),
        hscript('span.font-size', { style: 'font-size:0.75em;' }, 'CANCEL'),
        hscript('span', '].'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.NORMALIZED_FONT_SIZE);
  });

  it('should normalize font sizes given in pt', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        hscript('span', { style: 'font-size: 11pt' }, 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read. On the left was a big button that read ['),
        hscript('span', { style: 'font-size: 14pt' }, 'INITIATE HACK'),
        hscript('span', { style: 'font-size: 11pt' }, '], with another, smaller, button reading ['),
        hscript('span', { style: 'font-size: 8pt' }, 'CANCEL'),
        hscript('span', { style: 'font-size: 11pt' }, '].'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();

    workspace.normalizeFontSizes();
    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('span', 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read. On the left was a big button that read ['),
        hscript('span.font-size', { style: 'font-size:1.27273em;' }, 'INITIATE HACK'),
        hscript('span', '], with another, smaller, button reading ['),
        hscript('span.font-size', { style: 'font-size:0.72727em;' }, 'CANCEL'),
        hscript('span', '].'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.NORMALIZED_FONT_SIZE);
  });

  it('should convert a single font-size style to 1em', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        hscript('span', { style: 'font-size: 11pt' }, 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read. On the left was a big button that read ['),
        hscript('span', { style: 'font-size: 11pt' }, 'INITIATE HACK'),
        hscript('span', { style: 'font-size: 11pt' }, '], with another, smaller, button reading ['),
        hscript('span', { style: 'font-size: 11pt' }, 'CANCEL'),
        hscript('span', { style: 'font-size: 11pt' }, '].'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();

    workspace.normalizeFontSizes();
    expect(workspace.notes).toContain(Note.NORMALIZED_FONT_SIZE);
    const ruleValues = workspace.styleMap.rules.map(rule => rule.declarations[0].value);
    expect(ruleValues).toEqual(expect.arrayContaining(['1em']));

    workspace.makeStylesInline();
    // no font-size styles in the output, because makeStylesInline skips 1em;
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('span', 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read. On the left was a big button that read ['),
        hscript('span', 'INITIATE HACK'),
        hscript('span', '], with another, smaller, button reading ['),
        hscript('span', 'CANCEL'),
        hscript('span', '].'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.NORMALIZED_FONT_SIZE);
  });

  it('should convert font tags to font styles', () => {
    // LibreOffice sometimes uses actual font tags
    // <font face="Gentium"><font size="5" style="font-size: 20pt">Header</font></font>
    // the size is ignorable, since it's paired with an actual size style
    // but we need to get at that font face
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('font', { face: 'Courier Prime,monospace' }, hscript('font', { size: '5', style: 'font-size: 20pt' }, 'Header')),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();

    workspace.handleFontTags();
    workspace.makeStylesInline(false, false); // preserve all properties, no classes
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('span', { style: 'font-family:Courier Prime,monospace;' }, hscript('span', { style: 'font-size:20pt;' }, 'Header')),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should convert monospace fonts to code tags', () => {
    // TODO: after upgrading to neutrino v9, convert this to it.each
    const families = [
      'Cousine,monospace', '"Source Code Pro",monospace', 'Consolas',
      '"Courier Prime"', 'Courier', '"Courier New"', '"Menlo"', '"Monaco"', '"Fira Mono"',
    ];
    families.forEach((family) => {
      const inputHast = uscript('root', [
        hscript('p', [
          'The dot-matrix printout said simply, ',
          hscript('span', { style: `font-family: ${family};` }, 'You will die in 24 hours.'),
          ' I screamed.',
        ]),
      ]);
      const workspace = new StyleWorkspace(inputHast);
      workspace.inlineStylesToClassSelectorStyles();

      workspace.handleMonospaceFonts();
      workspace.makeStylesInline();
      const expectedHast = uscript('root', [
        hscript('p', [
          'The dot-matrix printout said simply, ',
          hscript('span', hscript('code', 'You will die in 24 hours.')),
          ' I screamed.',
        ]),
      ]);
      expect(workspace.hast).toEqual(expectedHast);
      expect(workspace.notes).toContain(Note.MONOSPACE);
    });
  });

  it('should handle blank lines between paragraphs', () => {
    const texts = [1, 2, 3, 4, 5, 6, 7].map(() => lorem.generateParagraphs(1));
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', texts[0]),
        hscript('br'),
        hscript('p', texts[1]),
        hscript('br'),
        hscript('p', texts[2]),
        hscript('br'),
        hscript('p', texts[3]),
        // user forgot to add a blank line here.
        hscript('p', texts[4]),
        hscript('br'),
        hscript('p', texts[5]),
        hscript('br'),
        hscript('p', texts[6]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast, [Note.DETECTED_GOOGLE_DOCS]);
    workspace.handleWhitespaceBetweenParas();
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', texts[0]),
        hscript('p', texts[1]),
        hscript('p', texts[2]),
        hscript('p', texts[3]),
        hscript('p', texts[4]),
        hscript('p', texts[5]),
        hscript('p', texts[6]),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.INTER_PARA_SPACING);
  });

  it('should handle blank lines within paragraphs', () => {
    // gdocs does _this_ if you use shift-Enter, instead of Enter
    const texts = [1, 2, 3, 4, 5, 6, 7].map(() => lorem.generateParagraphs(1));
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', [
          // pretend these spans have styles, because they probably will in the real world
          hscript('span', texts[0]),
          hscript('span', hscript('br')),
          hscript('span', hscript('br')),
          hscript('span', texts[1]),
          hscript('span', hscript('br')),
          hscript('span', hscript('br')),
          hscript('span', texts[2]),
          hscript('span', hscript('br')),
          hscript('span', hscript('br')),
          hscript('span', texts[3]),
          // just one line here, due to user error
          hscript('span', hscript('br')),
          hscript('span', texts[4]),
          hscript('span', hscript('br')),
          hscript('span', hscript('br')),
          hscript('span', texts[5]),
          hscript('span', hscript('br')),
          hscript('span', hscript('br')),
          hscript('span', texts[6]),
        ]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast, [Note.DETECTED_GOOGLE_DOCS]);
    workspace.handleWhitespaceBetweenParas();
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', hscript('span', texts[0])),
        hscript('p', hscript('span', texts[1])),
        hscript('p', hscript('span', texts[2])),
        hscript('p', hscript('span', texts[3])),
        hscript('p', hscript('span', texts[4])),
        hscript('p', hscript('span', texts[5])),
        hscript('p', hscript('span', texts[6])),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.INTER_PARA_SPACING);
  });

  it('should detect irregular blank lines within paragraphs', () => {
    // if the number of br tags don't support automatically removing them
    // we should still log it
    const texts = [1, 2, 3, 4, 5, 6, 7].map(() => lorem.generateParagraphs(1));
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', [
          // pretend these spans have styles, because they probably will in the real world
          hscript('span', texts[0]),
        ]),
        hscript('p', [
          hscript('span', texts[1]),
        ]),
        hscript('p', [
          hscript('span', texts[2]),
        ]),
        hscript('p', [
          hscript('span', texts[3]),
        ]),
        hscript('p', [
          hscript('span', texts[4]),
          hscript('span', hscript('br')),
          hscript('span', hscript('br')),
          hscript('span', texts[5]),
        ]),
        hscript('p', [
          hscript('span', texts[6]),
        ]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast, [Note.DETECTED_GOOGLE_DOCS]);
    workspace.handleWhitespaceBetweenParas();
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', hscript('span', texts[0])),
        hscript('p', hscript('span', texts[1])),
        hscript('p', hscript('span', texts[2])),
        hscript('p', hscript('span', texts[3])),
        hscript('p', [
          hscript('span', texts[4]),
          hscript('span', hscript('br')),
          hscript('span', hscript('br')),
          hscript('span', texts[5]),
        ]),
        hscript('p', hscript('span', texts[6])),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.DETECTED_IRREGULAR_INTER_PARA_SPACING);
  });

  it('should handle desktop apps\'s blank lines between paragraphs', () => {
    // <p style="min-height: 18.0px"><br></p>
    // there might be a <span> inside the <p> though
    // <p style="min-height: 18.0px"><span style="font-kerning: none"></span><br></p>
    // that one's from TextEdit.
    // and LibreOffice just has <p style="text-indent: 0.5in; margin-bottom: 0in"><br/></p>
    // where the <p> styles are the same styles used on all other <p> tags.
    // so this test works for LibreOffice too.
    const texts = [1, 2, 3, 4, 5, 6, 7].map(() => lorem.generateParagraphs(1));
    const makeBlankPara = () => hscript('p', [hscript('span'), hscript('br')]);
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', texts[0]),
        makeBlankPara(),
        hscript('p', texts[1]),
        makeBlankPara(),
        hscript('p', texts[2]),
        makeBlankPara(),
        hscript('p', texts[3]),
        // user forgot to add a blank line here.
        hscript('p', texts[4]),
        makeBlankPara(),
        hscript('p', texts[5]),
        makeBlankPara(),
        hscript('p', texts[6]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast, [Note.DETECTED_MACOS]);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.removeEmptySpans();
    workspace.handleWhitespaceBetweenParas();
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', texts[0]),
        hscript('p', texts[1]),
        hscript('p', texts[2]),
        hscript('p', texts[3]),
        hscript('p', texts[4]),
        hscript('p', texts[5]),
        hscript('p', texts[6]),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.INTER_PARA_SPACING);
  });

  it('should handle msword\'s blank lines between paragraphs', () => {
    // <p class=MsoNormal><span style='font-size:9.0pt;line-height:115%;font-family:
    // "Courier New"'></span></p>
    // the empty span is removed by removeEmptySpans()
    // so just an empty paragraph
    const texts = [1, 2, 3, 4, 5, 6, 7].map(() => lorem.generateParagraphs(1));
    const makeBlankPara = () => hscript('p', [hscript('span')]);
    const inputHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', texts[0]),
        makeBlankPara(),
        hscript('p', texts[1]),
        makeBlankPara(),
        hscript('p', texts[2]),
        makeBlankPara(),
        hscript('p', texts[3]),
        // user forgot to add a blank line here.
        hscript('p', texts[4]),
        makeBlankPara(),
        hscript('p', texts[5]),
        makeBlankPara(),
        hscript('p', texts[6]),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast, [Note.DETECTED_MSWORD]);
    workspace.removeEmptySpans();
    workspace.handleWhitespaceBetweenParas();
    const expectedHast = uscript('root', [
      hscript('div', [
        hscript('h1', 'Title!'),
        hscript('p', texts[0]),
        hscript('p', texts[1]),
        hscript('p', texts[2]),
        hscript('p', texts[3]),
        hscript('p', texts[4]),
        hscript('p', texts[5]),
        hscript('p', texts[6]),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.notes).toContain(Note.INTER_PARA_SPACING);
  });

  it('should remove excess spans', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        hscript('span', hscript('span')),
        hscript('span'),
        hscript('span', 'Hello '),
        hscript('span', { style: 'font-size: 1.1em;' }, 'World'),
        hscript('span', hscript('b', '!')),
        hscript('span'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.removeUnneededSpans();
    const expectedHast = uscript('root', [
      hscript('p', [
        'Hello ',
        hscript('span', { style: 'font-size: 1.1em;' }, 'World'),
        hscript('b', '!'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move leading whitespace out of bisu nodes', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        'Hello',
        hscript('b', ' World'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        'Hello',
        ' ',
        hscript('b', 'World'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move leading newline whitespace out of bisu nodes', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        'Hello',
        hscript('b', '\nWorld'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        'Hello',
        '\n',
        hscript('b', 'World'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move leading tab whitespace out of bisu nodes', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        'Hello',
        hscript('b', '\tWorld'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        'Hello',
        '\t',
        hscript('b', 'World'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move leading whitespace out of bisu nodes, even if nested', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        'Hello',
        hscript('b', hscript('i', ' World')),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        'Hello',
        ' ',
        hscript('b', hscript('i', 'World')),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move trailing whitespace out of bisu nodes', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        hscript('b', 'Hello '),
        'World',
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('b', 'Hello'),
        ' ',
        'World',
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move trailing newline whitespace out of bisu nodes', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        hscript('b', 'Hello\n'),
        'World',
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('b', 'Hello'),
        '\n',
        'World',
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move trailing tab whitespace out of bisu nodes', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        hscript('b', 'Hello\t'),
        'World',
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('b', 'Hello'),
        '\t',
        'World',
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move trailing whitespace out of bisu nodes, even if nested', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        hscript('b', hscript('i', 'Hello ')),
        'World',
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('b', hscript('i', 'Hello')),
        ' ',
        'World',
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move trailing whitespace out of span nodes', () => {
    const inputHast = uscript('root', [
      hscript('p', [
        hscript('span', 'Hello '),
        'World',
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.handleLeadingTrailingBisuWhitespace();
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('span', 'Hello'),
        ' ',
        'World',
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should strip ids from tags', () => {
    const inputHast = uscript('root', [
      hscript('p', { id: 'sample-id' }, [
        hscript('span', 'Hello World'),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.stripIds();
    const expectedHast = uscript('root', [
      hscript('p', [
        hscript('span', 'Hello World'),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should convert text-align:start to left and text-align:end to right', () => {
    const inputHast = uscript('root', [
      hscript('p', { style: 'text-align: start' }, 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read.'),
      hscript('p', { style: 'text-align: end' }, ' On the left was a big button that read [INITIATE HACK.]'),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();

    workspace.normalizeTextAlignRules();
    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('p.text-align', { style: 'text-align:left;' }, 'I looked at the screen. It was a standard Hollywood UI, with scrolling windows full of garbage text flowing upwards faster than anyone could read.'),
      hscript('p.text-align', { style: 'text-align:right;' }, ' On the left was a big button that read [INITIATE HACK.]'),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should handle redundant styles', () => {
    const headline = lorem.generateWords(3);
    const bodytext = lorem.generateParagraphs(1);
    const inputHast = uscript('root', [
      hscript('p', { style: 'margin: 13.0px 0.0px 0.0px 0.0px; font: 18.0px Palatino' }, [
        hscript('span', { style: 'font-family: \'Palatino\'; font-weight: bold; font-style: normal; font-size: 18.00pt' }, headline),
      ]),
      hscript('p', { style: 'margin: 0.0px 0.0px 0.0px 0.0px; text-indent: 18.0px; font: 13.0px Palatino' }, [
        hscript('span', { style: 'font-family: \'Palatino-Roman\'; font-weight: normal; font-style: normal; font-size: 13.00pt' }, bodytext),
      ]),
      hscript('p', { style: 'margin: 0.0px 0.0px 0.0px 0.0px; text-indent: 18.0px; font: 13.0px Palatino' }, [
        hscript('span', { style: 'font-family: \'Palatino-Roman\'; font-weight: normal; font-style: normal; font-size: 13.00pt' }, bodytext),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();

    workspace.filterStyleDeclarations();
    workspace.pruneUnusedStyles(true);
    workspace.mergeSharedStyles();
    workspace.normalizeFontSizes();
    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('p.font-size', { style: 'font-size:1.38462em;' }, [
        hscript('span', {}, headline),
      ]),
      hscript('p', {}, [
        hscript('span', {}, bodytext),
      ]),
      hscript('p', {}, [
        hscript('span', {}, bodytext),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should move span styles to parent', () => {
    const headline = lorem.generateWords(3);
    const bodytext = lorem.generateParagraphs(1);
    const inputHast = uscript('root', [
      hscript('p', { style: '' }, [
        hscript('span.font-size', { style: 'font-size:18.00pt;' }, headline),
      ]),
      hscript('p', { style: '' }, [
        hscript('span.font-size', { style: 'font-size:13.00pt;' }, bodytext),
      ]),
      hscript('p', { style: '' }, [
        hscript('span.font-size', { style: 'font-size:13.00pt;' }, bodytext),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();

    workspace.filterStyleDeclarations();
    workspace.pruneUnusedStyles(true);
    workspace.mergeSharedStyles();

    workspace.removeUnneededSpans();
    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('p.font-size', { style: 'font-size:18.00pt;' }, headline),
      hscript('p.font-size', { style: 'font-size:13.00pt;' }, bodytext),
      hscript('p.font-size', { style: 'font-size:13.00pt;' }, bodytext),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });

  it('should handle Markdown thematic breaks', () => {
    const p1 = lorem.generateParagraphs(1);
    const p2 = lorem.generateParagraphs(1);
    const inputHast = uscript('root', [
      hscript('p', {}, [
        hscript('span', { style: 'font-size:11pt;font-weight:400;font-style:normal;text-decoration:none;' }, p1),
      ]),
      hscript('p', { style: 'text-align: center;' }, [
        hscript('span', { style: 'font-size:11pt;font-weight:400;font-style:normal;text-decoration:none;' }, ' * * * '),
      ]),
      hscript('p', {}, [
        hscript('span', { style: 'font-size:11pt;font-weight:400;font-style:normal;text-decoration:none;' }, p2),
      ]),
    ]);
    const workspace = new StyleWorkspace(inputHast);
    workspace.inlineStylesToClassSelectorStyles();
    workspace.makeSingleDeclarationSingleClassForm();

    workspace.filterStyleDeclarations();
    workspace.pruneUnusedStyles(true);
    workspace.mergeSharedStyles();
    workspace.normalizeFontSizes();
    workspace.removeUnneededSpans();

    workspace.handleMarkdownThematicBreaks();

    workspace.makeStylesInline();
    const expectedHast = uscript('root', [
      hscript('p', {}, p1),
      hscript('hr'),
      hscript('p', {}, p2),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });
});
