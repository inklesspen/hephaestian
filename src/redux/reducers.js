import { createReducer } from 'redux-starter-kit';
import { combineReducers } from 'redux';

import {
  resetState, pasteRichText, htmlValueChanged, markdownValueChanged, processingNotesChanged,
} from './actions';

const pastedRichText = createReducer(null, {
  [pasteRichText]: (state, action) => action.payload,
});

const activeFormat = createReducer(null, {
  [htmlValueChanged]: () => 'html',
  [markdownValueChanged]: () => 'markdown',
});

const htmlValue = createReducer(null, {
  [htmlValueChanged]: (state, action) => action.payload,
});

const markdownValue = createReducer(null, {
  [markdownValueChanged]: (state, action) => action.payload,
});

const processingNotes = createReducer(null, {
  // make notes unique
  [processingNotesChanged]: (state, action) => Array.from(new Set(action.payload)),
});

const rootReducer = combineReducers({
  pastedRichText,
  activeFormat,
  htmlValue,
  markdownValue,
  processingNotes,
});

function resettableReducer(state = {}, action) {
  if (action.type === resetState.type) {
    return {};
  }
  return rootReducer(state, action);
}

export default resettableReducer;
