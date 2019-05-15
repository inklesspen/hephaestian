import hastUtilFromHtmlparser2 from './hast-util-from-htmlparser2';

export default function parse(options) {
  // eslint-disable-next-line no-unused-vars
  const settings = { ...options, ...this.data('settings') };

  // eslint-disable-next-line no-unused-vars
  function parser(doc, file) {
    return hastUtilFromHtmlparser2(doc);
  }

  this.Parser = parser;
}
