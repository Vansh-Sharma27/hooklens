const test = require('node:test');
const assert = require('node:assert');

const { isPrivateAddress, ALLOWED_PROTOCOLS } = require('../server/utils/forwardPolicy');

test('loopback addresses are recognised as private', () => {
  assert.strictEqual(isPrivateAddress('127.0.0.1'), true);
  assert.strictEqual(isPrivateAddress('127.255.255.254'), true);
  assert.strictEqual(isPrivateAddress('::1'), true);
});

test('RFC1918 ranges are recognised as private', () => {
  assert.strictEqual(isPrivateAddress('10.0.0.1'), true);
  assert.strictEqual(isPrivateAddress('172.16.0.1'), true);
  assert.strictEqual(isPrivateAddress('172.31.255.255'), true);
  assert.strictEqual(isPrivateAddress('192.168.1.1'), true);
});

test('cloud instance metadata address is recognised as private', () => {
  assert.strictEqual(isPrivateAddress('169.254.169.254'), true);
});

test('addresses just outside the private ranges are public', () => {
  assert.strictEqual(isPrivateAddress('172.32.0.1'), false);
  assert.strictEqual(isPrivateAddress('11.0.0.1'), false);
  assert.strictEqual(isPrivateAddress('192.169.0.1'), false);
  assert.strictEqual(isPrivateAddress('8.8.8.8'), false);
  assert.strictEqual(isPrivateAddress('1.1.1.1'), false);
});

test('IPv4-mapped IPv6 addresses are unwrapped before checking', () => {
  assert.strictEqual(isPrivateAddress('::ffff:127.0.0.1'), true);
  assert.strictEqual(isPrivateAddress('::ffff:169.254.169.254'), true);
  assert.strictEqual(isPrivateAddress('::ffff:8.8.8.8'), false);
});

test('IPv6 unique-local and link-local ranges are private', () => {
  assert.strictEqual(isPrivateAddress('fc00::1'), true);
  assert.strictEqual(isPrivateAddress('fd12:3456::1'), true);
  assert.strictEqual(isPrivateAddress('fe80::1'), true);
  assert.strictEqual(isPrivateAddress('2606:4700:4700::1111'), false);
});

test('only http and https are permitted schemes', () => {
  assert.strictEqual(ALLOWED_PROTOCOLS.has('http:'), true);
  assert.strictEqual(ALLOWED_PROTOCOLS.has('https:'), true);
  assert.strictEqual(ALLOWED_PROTOCOLS.has('file:'), false);
  assert.strictEqual(ALLOWED_PROTOCOLS.has('gopher:'), false);
  assert.strictEqual(ALLOWED_PROTOCOLS.has('ftp:'), false);
});
