import hscript from 'hastscript';
import uscript from 'unist-builder';

import { cssScript, StyleWorkspace } from '../../src/processing/styles';

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
});
