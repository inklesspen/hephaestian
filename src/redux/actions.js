import { createAction } from 'redux-starter-kit';

import * as bluebird from 'bluebird';

import { cleanupRichText } from '../processing/cleanup';
import convertMarkdown from '../processing/markdown';
import { isHephaestianGeneratedHtml } from '../processing/util';

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

export function processUploadedHephaestianHtml(html, historyPush) {
  return (dispatch) => {
    if (isHephaestianGeneratedHtml(html)) {
      dispatch(htmlValueChanged(html));
      historyPush('/download/overview');
    } else {
      historyPush('/');
    }
  };
}

export function processMarkdown(markdown, historyPush) {
  return (dispatch) => {
    bluebird.delay(0).then(() => {
      historyPush('/spinner');
    }).then(() => convertMarkdown(markdown)).then(({ html, notes }) => {
      dispatch(htmlValueChanged(html));
      dispatch(processingNotesChanged(notes.map(note => note.name)));
      historyPush('/preview');
    });
  };
}
