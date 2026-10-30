/**
 * Punycode A-label Decoder — converts IDNA A-labels (xn-- prefixed
 * ASCII) back to U-labels per RFC 5890.
 *
 * Implementation note:
 * We deliberately implement only the parts of RFC 3492 needed to
 * decode a single label. We do NOT re-implement full IDNA validity
 * checking (contextJ/Z rules, bidi, normalization). The input is
 * expected to be a valid A-label produced by an encoder; this library
 * focuses on the decoding step. If you need full IDNA validation, use
 * the platform's `URL` API or a dedicated IDNA library upstream.
 */

const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 0x80;
const ACE_PREFIX = 'xn--';

/**
 * Bias adaptation function from RFC 3492 §6.1.
 * Called after each insertion to keep the next variable-length
 * integer reading in sync with the running state.
 */
function adapt(delta, numPoints, firstTime) {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor((BASE - TMIN + 1) * delta / (delta + SKEW));
}

/**
 * Decode a single variable-length integer from `str` starting at
 * index `idx`. Returns `[value, nextIdx]` or throws on malformed input.
 */
function decodeDigit(code) {
  // 0..25 => a..z (case-insensitive)
  if (code >= 97 && code <= 122) return code - 97;
  if (code >= 65 && code <= 90) return code - 65;
  // 26..35 => 0..9
  if (code >= 48 && code <= 57) return code - 48 + 26;
  throw new Error('Invalid Punycode digit: ' + String.fromCharCode(code));
}

/**
 * Decode the Punycode portion (without the xn-- prefix).
 * Mirrors the reference C decoder from RFC 3492 appendix.
 */
function punycodeDecode(input) {
  const output = [];

  // 1. Find last dot-adjacent delimiter? For a single label there is
  //    no dot; we still support the RFC's "basic code points before
  //    last delimiter" rule. In practice the delimiter is the final
  //    '-' before the encoded tail.
  let basicEnd = input.lastIndexOf('-');
  if (basicEnd < 0) basicEnd = 0; // no basic portion

  for (let i = 0; i < basicEnd; i++) {
    const c = input.charCodeAt(i);
    if (c > 0x7f) {
      throw new Error('Non-ASCII character in basic portion of A-label');
    }
    output.push(c);
  }

  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;

  let pos = basicEnd > 0 ? basicEnd + 1 : 0;

  while (pos < input.length) {
    const oldi = i;
    let w = 1;
    let k = BASE;
    for (;;) {
      if (pos >= input.length) {
        throw new Error('Truncated Punycode input');
      }
      const digit = decodeDigit(input.charCodeAt(pos));
      pos++;
      i += digit * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
      k += BASE;
    }
    const numPoints = output.length + 1;
    bias = adapt(i - oldi, numPoints, oldi === 0);
    n += Math.floor(i / numPoints);
    i %= numPoints;
    output.splice(i, 0, n);
    i++;
  }

  return output.map((cp) => String.fromCodePoint(cp)).join('');
}

/**
 * Validate that a string is a plausible A-label.
 * Rules (subset, intentionally conservative):
 *  - Must start with "xn--" (case-insensitive).
 *  - After prefix, length >= 1.
 *  - Entire label is ASCII.
 * Throws a descriptive Error on rejection.
 */
function validateALabel(label) {
  if (typeof label !== 'string') {
    throw new Error('A-label must be a string');
  }
  const lower = label.toLowerCase();
  if (!lower.startsWith(ACE_PREFIX)) {
    throw new Error('A-label must start with "xn--" (got: ' + label + ')');
  }
  const tail = label.slice(ACE_PREFIX.length);
  if (tail.length === 0) {
    throw new Error('A-label has no encoded content after "xn--"');
  }
  // ASCII check — any code > 0x7f is illegal in an A-label.
  for (let i = 0; i < label.length; i++) {
    if (label.charCodeAt(i) > 0x7f) {
      throw new Error('A-label contains non-ASCII character');
    }
  }
  return tail;
}

/**
 * Decode an IDNA A-label to its U-label (Unicode) form.
 *
 * @param {string} aLabel - ASCII label beginning with "xn--".
 * @returns {string} The decoded Unicode (U-label) string.
 * @throws {Error} if the input is not a valid A-label or the Punycode
 *   payload is malformed.
 */
export function decodeALabel(aLabel) {
  const tail = validateALabel(aLabel);
  return punycodeDecode(tail);
}
