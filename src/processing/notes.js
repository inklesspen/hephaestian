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
  INTER_PARA_SPACING: 'Removed inter-paragraph blank space',
};

const noteEntries = [
  'DETECTED_GOOGLE_DOCS',
  'DETECTED_MACOS', 'DETECTED_LIBREOFFICE',
  'INTER_PARA_SPACING',
].map(kw => [kw, {
  short: shortExplanations[kw],
}]);

class Note extends ExtendedArrayEnum { }
Note.initEnum(noteEntries);

export default Note;
