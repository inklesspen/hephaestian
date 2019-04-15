import { createAction } from 'redux-starter-kit';

import * as bluebird from 'bluebird';

import { processHtml, processMarkdown } from '../processing/cleanup';
import fixhtml from '../processing/fixhtml';
import cleanStyles from '../processing/styles';

export const resetState = createAction('reset');
export function resetStateAndHistory(history) {
  return (dispatch) => {
    history.go(1 - history.length);
    dispatch(resetState());
  };
}

export const pasteRichText = createAction('richText/paste');
export const htmlValueChanged = createAction('html/valueChanged');
export const markdownValueChanged = createAction('markdown/valueChanged');

export const valueProcessed = createAction('richText/processed');

export function processPastedRichText(pastedHtml, historyPush) {
  return (dispatch) => {
    // a slight delay is necessary so that the Squire paste-handling completes
    bluebird.delay(10).then(() => {
      dispatch(pasteRichText(pastedHtml));
      historyPush('/spinner');
    }).then(() => fixhtml(pastedHtml)).then(({ notes, html }) => {
      const result = cleanStyles(html, notes);
      const fixedHtml = result.html;
      // eslint-disable-next-line no-console
      console.log(result.notes);
      dispatch(htmlValueChanged(fixedHtml));
      historyPush('/preview');
    });
  };
}

export function previewResult(history) {
  return (dispatch, getState) => {
    const currentState = getState();
    const format = currentState.activeFormat;
    const [value, func] = (format === 'html') ?
      [currentState.htmlValue, processHtml] :
      [currentState.markdownValue, processMarkdown];

    dispatch(valueProcessed(func(value)));
    history.go('/preview');
  };
}
