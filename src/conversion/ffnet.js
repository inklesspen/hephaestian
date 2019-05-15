// ffnet does not support heading tags (<h1> and friends), nor lists, nor text sizes.
// ffnet also does not support colors, but we don't yet either.
// however, leaving these things in doesn't seem to cause any trouble, so this
// "converter" is in fact a no-op.

export default function ffnet(html) {
  return html;
}
