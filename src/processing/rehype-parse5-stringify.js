import { serialize as parse5Serialize } from 'parse5';
import hastUtilToParse5 from 'hast-util-to-parse5';


export default function stringify(options) {
  // eslint-disable-next-line no-unused-vars
  const settings = { ...options, ...this.data('settings') };

  function compiler(tree) {
    const ast = hastUtilToParse5(tree);
    return parse5Serialize(ast);
  }

  this.Compiler = compiler;
}
