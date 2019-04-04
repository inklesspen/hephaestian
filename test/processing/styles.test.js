import hscript from 'hastscript';
import uscript from 'unist-builder';
import { LoremIpsum } from 'lorem-ipsum';

import { cssScript, StyleWorkspace } from '../../src/processing/styles';

const lorem = new LoremIpsum();

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
    const inputRules = [
      cssScript.r('.hephaestian-style-1', cssScript.d('line-height', '1.38')),
      cssScript.r('.hephaestian-style-2', cssScript.d('margin-top', '0pt')),
      cssScript.r('.hephaestian-style-3', cssScript.d('margin-bottom', '0pt')),
      cssScript.r('.hephaestian-style-4', cssScript.d('text-indent', '36pt')),
      cssScript.r('.hephaestian-style-5', cssScript.d('font-size', '11pt')),
      cssScript.r('.hephaestian-style-6', cssScript.d('font-family', 'Arial')),
      cssScript.r('.hephaestian-style-7', cssScript.d('color', '#000000')),
      cssScript.r('.hephaestian-style-8', cssScript.d('background-color', 'transparent')),
      cssScript.r('.hephaestian-style-9', cssScript.d('font-weight', '400')),
      cssScript.r('.hephaestian-style-10', cssScript.d('font-style', 'normal')),
      cssScript.r('.hephaestian-style-11', cssScript.d('font-variant', 'normal')),
      cssScript.r('.hephaestian-style-12', cssScript.d('text-decoration', 'none')),
      cssScript.r('.hephaestian-style-13', cssScript.d('vertical-align', 'baseline')),
      cssScript.r('.hephaestian-style-14', cssScript.d('white-space', 'pre')),
      cssScript.r('.hephaestian-style-15', cssScript.d('white-space', 'pre-wrap')),
      cssScript.r('.hephaestian-style-16', cssScript.d('vertical-align', 'super')),
      cssScript.r('.hephaestian-style-17', cssScript.d('vertical-align', 'sub')),
    ];
    const workspace = new StyleWorkspace(inputHast);
    workspace.styleMap.stylesheetContainer.stylesheet.rules.push(...inputRules);
    workspace.styleMap.classNameCounter = inputRules.length;

    workspace.filterStyleDeclarations();
    const expectedRules = [
      cssScript.r('.hephaestian-style-5', cssScript.d('font-size', '11pt')),
      cssScript.r('.hephaestian-style-6', cssScript.d('font-family', 'Arial')),
      cssScript.r('.hephaestian-style-7', cssScript.d('color', '#000000')),
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
      hscript('body', [
        hscript('p', 'Some body text'),
        hscript('p', hscript('br')),
        hscript('p', hscript('span', 'More body text')),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
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
    const inputRules = [
      cssScript.r('.hephaestian-style-1', cssScript.d('margin-left', '72pt')),
    ];
    const workspace = new StyleWorkspace(inputHast);
    workspace.styleMap.stylesheetContainer.stylesheet.rules.push(...inputRules);
    workspace.styleMap.classNameCounter = inputRules.length;

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
      hscript('body', [
        hscript('p', { class: 'hephaestian-style-1' }, text),
        hscript('p', { class: 'hephaestian-style-1' }, text),
        hscript('p', { class: 'hephaestian-style-1' }, text),
        hscript('p', { class: 'hephaestian-style-1' }, text),
        hscript('p', { class: 'hephaestian-style-2' }, text),
        hscript('p', { class: 'hephaestian-style-2' }, text),
        hscript('p', { class: 'hephaestian-style-1' }, text),
        hscript('p', { class: 'hephaestian-style-1' }, text),
        hscript('p', { class: 'hephaestian-style-1' }, text),
      ]),
    ]);
    const inputRules = [
      cssScript.r('.hephaestian-style-1', cssScript.d('margin-left', '0.0px')),
      cssScript.r('.hephaestian-style-2', cssScript.d('margin-left', '36.0px')),
    ];
    const workspace = new StyleWorkspace(inputHast);
    workspace.styleMap.stylesheetContainer.stylesheet.rules.push(...inputRules);
    workspace.styleMap.classNameCounter = inputRules.length;
    workspace.normalizeLeftMargins();
    const expectedHast = uscript('root', [
      hscript('body', [
        hscript('p', { class: '' }, text),
        hscript('p', { class: '' }, text),
        hscript('p', { class: '' }, text),
        hscript('p', { class: '' }, text),
        hscript('blockquote', { class: '' }, text),
        hscript('blockquote', { class: '' }, text),
        hscript('p', { class: '' }, text),
        hscript('p', { class: '' }, text),
        hscript('p', { class: '' }, text),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
    expect(workspace.styleMap.rules).toEqual([]);
  });

  it('should normalize font-weights', () => {
    const texts = [1, 2, 3, 4, 5, 6, 7, 8].map(() => lorem.generateParagraphs(1));
    const inputHast = uscript('root', [
      hscript('body', [
        hscript('p', { class: 'hephaestian-style-1' }, texts[0]),
        hscript('p', { class: 'hephaestian-style-2' }, texts[1]),
        hscript('p', { class: 'hephaestian-style-3' }, texts[2]),
        hscript('p', { class: 'hephaestian-style-4' }, texts[3]),
        hscript('p', { class: 'hephaestian-style-5' }, texts[4]),
        hscript('p', { class: 'hephaestian-style-2' }, texts[5]),
        hscript('p', { class: 'hephaestian-style-6' }, texts[6]),
        hscript('p', { class: 'hephaestian-style-7' }, texts[7]),
      ]),
    ]);
    const inputRules = [
      cssScript.r('.hephaestian-style-1', cssScript.d('font-weight', 'normal')),
      cssScript.r('.hephaestian-style-2', cssScript.d('font-weight', 'bold')),
      cssScript.r('.hephaestian-style-3', cssScript.d('font-weight', '300')),
      cssScript.r('.hephaestian-style-4', cssScript.d('font-weight', '400')),
      cssScript.r('.hephaestian-style-5', cssScript.d('font-weight', '600')),
      cssScript.r('.hephaestian-style-6', cssScript.d('font-weight', '800')),
      cssScript.r('.hephaestian-style-7', cssScript.d('font-weight', '900')),
    ];
    const workspace = new StyleWorkspace(inputHast);
    workspace.styleMap.stylesheetContainer.stylesheet.rules.push(...inputRules);
    workspace.styleMap.classNameCounter = inputRules.length;

    workspace.normalizeFontWeights();
    const expectedHast = uscript('root', [
      hscript('body', [
        hscript('p', { class: 'hephaestian-style-8' }, texts[0]),
        hscript('p', { class: 'hephaestian-style-9' }, texts[1]),
        hscript('p', { class: 'hephaestian-style-8' }, texts[2]),
        hscript('p', { class: 'hephaestian-style-8' }, texts[3]),
        hscript('p', { class: 'hephaestian-style-9' }, texts[4]),
        hscript('p', { class: 'hephaestian-style-9' }, texts[5]),
        hscript('p', { class: 'hephaestian-style-9' }, texts[6]),
        hscript('p', { class: 'hephaestian-style-9' }, texts[7]),
      ]),
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
        hscript('span', { style: 'font-family:serif;' }, hscript('sup', 'superscript')),
        hscript('span', { style: 'font-family:serif;' }, hscript('sub', 'subscript')),
      ]),
    ]);
    expect(workspace.hast).toEqual(expectedHast);
  });
});
