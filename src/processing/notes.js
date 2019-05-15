import qw from 'qw';
import { Enum } from 'enumify';

class ExtendedArrayEnum extends Enum {
  static _enumValuesFromArray(arr) {
    arr.forEach(([key, val]) => {
      // eslint-disable-next-line no-underscore-dangle
      this._pushEnumValue(new this(val), key);
    });
  }
}

const shortExplanations = {
  DETECTED_GOOGLE_DOCS: 'Google Docs copy-paste detected',
  DETECTED_MACOS: 'macOS rich text copy-paste detected',
  DETECTED_LIBREOFFICE: 'LibreOffice copy-paste detected',
  DETECTED_MSWORD: 'MS Word copy-paste detected',
  PROCESSED_STYLESHEET: 'Processed CSS stylesheet',
  NARROWED_TO_BODY: 'Narrowed to <body> element',
  INTER_PARA_SPACING: 'Removed inter-paragraph blank space',
  MONOSPACE: 'Monospace font usage detected',
  NORMALIZED_FONT_SIZE: 'Font sizes normalized',
  DETECTED_IRREGULAR_INTER_PARA_SPACING: 'Irregular newlines detected; check paragraph separation',
};

const noteEntries = qw`
DETECTED_GOOGLE_DOCS DETECTED_MACOS DETECTED_LIBREOFFICE DETECTED_MSWORD
PROCESSED_STYLESHEET NARROWED_TO_BODY
INTER_PARA_SPACING MONOSPACE NORMALIZED_FONT_SIZE
DETECTED_IRREGULAR_INTER_PARA_SPACING
`.map(kw => [kw, {
    short: shortExplanations[kw],
  }]);

class Note extends ExtendedArrayEnum { }
Note.initEnum(noteEntries);

export default Note;
