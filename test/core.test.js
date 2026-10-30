import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeALabel } from '../src/core.js';

test('decodes the classic example mnchen-3ya to münchen', () => {
  assert.equal(decodeALabel('xn--mnchen-3ya'), 'münchen');
});

test('decodes pure-ASCII-looking but still encoded label', () => {
  // "xn--abc-" decodes to just "abc" (basic portion, no tail)
  assert.equal(decodeALabel('xn--abc-'), 'abc');
});

test('decodes a non-ASCII-only label (no basic portion)', () => {
  // "xn--nxasmq6b" is the Greek word "βόλοσ"
  assert.equal(decodeALabel('xn--nxasmq6b'), 'βόλοσ');
});

test('rejects empty string', () => {
  assert.throws(() => decodeALabel(''), /must start with/);
});

test('rejects missing xn-- prefix', () => {
  assert.throws(() => decodeALabel('münchen'), /must start with/);
});

test('rejects bare prefix with no content', () => {
  assert.throws(() => decodeALabel('xn--'), /no encoded content/);
});

test('rejects non-ASCII inside label', () => {
  assert.throws(() => decodeALabel('xn--münchën'), /non-ASCII/);
});

test('rejects non-string input', () => {
  assert.throws(() => decodeALabel(42), /must be a string/);
  assert.throws(() => decodeALabel(null), /must be a string/);
  assert.throws(() => decodeALabel(undefined), /must be a string/);
});

test('is case-insensitive on the ACE prefix', () => {
  assert.equal(decodeALabel('XN--mnchen-3ya'), 'münchen');
  assert.equal(decodeALabel('Xn--Mnchen-3ya'), 'München');
});

test('decodes a multi-codepoint CJK label', () => {
  // "xn--fiqs8s" => "中国"
  assert.equal(decodeALabel('xn--fiqs8s'), '中国');
});

test('decodes a label whose basic portion contains digits', () => {
  // Construct: xn--abc123-  where the basic portion is "abc123"
  // and there is no tail. This should round-trip to "abc123".
  assert.equal(decodeALabel('xn--abc123-'), 'abc123');
});

test('throws on invalid Punycode digit', () => {
  // '!' is not a valid Punycode digit
  assert.throws(() => decodeALabel('xn--abc!'), /Invalid Punycode digit/);
});
