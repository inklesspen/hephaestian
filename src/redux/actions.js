import { createAction } from 'redux-starter-kit';

import { processHtml, processMarkdown } from '../processing/cleanup';

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
