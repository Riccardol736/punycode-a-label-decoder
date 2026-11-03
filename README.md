# punycode-a-label-decoder

Converts internationalized domain name A-labels (the `xn--` prefixed ASCII form) back to Unicode U-labels per RFC 5890, implementing the RFC 3492 decoding algorithm with no external dependencies.

```js
import { decodeALabel } from 'punycode-a-label-decoder';

console.log(decodeALabel('xn--mnchen-3ya')); // "München"
console.log(decodeALabel('xn--fiqs8s'));     // "中国"
```

The single exported function is `decodeALabel(aLabel: string): string`. It throws an `Error` on any input that is not a string, does not begin with `xn--` (case-insensitive), contains non-ASCII characters, or has a malformed Punycode payload.

## Why this exists

Most JavaScript runtimes expose Punycode via `require('punycode')` or the `URL` API, but that module is deprecated in Node and absent from browsers. When you need to *just decode* an A-label — for logging, display, or diagnostic tooling — pulling in a full IDNA implementation is overkill. This library is the smallest correct decoder for that single job.

## Trade-off

This library decodes only. It does not perform full IDNA 2008 validity checking (contextJ/contextZ rules, bidi, normalization form NFC). It assumes the input A-label was produced by a conforming encoder. If you need to validate user-supplied domain names end-to-end, run this decoder and then validate the result with a dedicated IDNA library.

## Awkward edge

A-labels store any ASCII basic code points before the final `-` delimiter. A label like `xn--abc-` decodes to the plain string `abc` (no tail). A label like `xn--abc123-` decodes to `abc123`. If you expect every decoded result to contain non-ASCII characters, it will not — the basic portion is returned verbatim.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

