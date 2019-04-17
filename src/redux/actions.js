import { createAction } from 'redux-starter-kit';

import * as bluebird from 'bluebird';

import { cleanupRichText } from '../processing/cleanup';

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
export const processingNotesChanged = createAction('processingNotesChanged');

// export const valueProcessed = createAction('richText/processed');

export function processPastedRichText(pastedHtml, historyPush) {
  return (dispatch) => {
    // a slight delay is necessary so that the Squire paste-handling completes
    bluebird.delay(10).then(() => {
      dispatch(pasteRichText(pastedHtml));
      historyPush('/spinner');
    }).then(() => cleanupRichText(pastedHtml)).then(({ html, notes }) => {
      dispatch(htmlValueChanged(html));
      // can't put Note objects in the state, but the enum names are fine.
      dispatch(processingNotesChanged(notes.map(note => note.name)));
      historyPush('/preview');
    });
  };
}

// export function previewResult(history) {
//   return (dispatch, getState) => {
//     const currentState = getState();
//     const format = currentState.activeFormat;
//     const [value, func] = (format === 'html') ?
//       [currentState.htmlValue, processHtml] :
//       [currentState.markdownValue, processMarkdown];

//     dispatch(valueProcessed(func(value)));
//     history.go('/preview');
//   };
// }
