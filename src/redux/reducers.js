import { createReducer } from 'redux-starter-kit';
import { combineReducers } from 'redux';

import { resetState, pasteRichText } from './actions';

export const pastedRichText = createReducer([], {
  [pasteRichText]: (state, action) => [...state, action.payload],
});

const rootReducer = combineReducers({
  pastedRichText,
});

function resettableReducer(state = {}, action) {
  if (action.type === resetState.type) {
    return {};
  }
  return rootReducer(state, action);
}

export default resettableReducer;
