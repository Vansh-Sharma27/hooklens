const dns = require('node:dns').promises;
const net = require('node:net');

const { FORWARD_ALLOW_PRIVATE } = require('../config/constants');

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// Ranges that should never be reachable from a publicly exposed instance.
// 169.254.0.0/16 covers the cloud instance metadata address (169.254.169.254),
// which is the usual target when this class of bug is exploited.
const BLOCKED_V4 = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
];

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isBlockedV4(ip) {
  const value = ipv4ToInt(ip);

  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedV6(ip) {
  const normalized = ip.toLowerCase().split('%')[0];

  if (normalized === '::1' || normalized === '::') return true;

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedV4(mapped[1]);

  const firstGroup = parseInt(normalized.split(':')[0] || '0', 16);
  if ((firstGroup & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((firstGroup & 0xffc0) === 0xfe80) return true; // fe80::/10 link local

  return false;
}

/**
 * @param {string} address - Literal IPv4 or IPv6 address
 * @returns {boolean} true if the address is loopback, private, or reserved
 */
function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return isBlockedV4(address);
  if (family === 6) return isBlockedV6(address);
  return false;
}

/**
 * Reject a forward target before any request is made to it.
 *
 * Forwarding to localhost is the normal local workflow, so private destinations
 * are permitted by default and blocked only when FORWARD_ALLOW_PRIVATE is off
 * (which is the default under NODE_ENV=production). Scheme is always enforced.
 *
 * The hostname is resolved and every returned address is checked, because a
 * name under the caller's control can point anywhere. This narrows but does not
 * close the DNS rebinding window: the name is resolved again by fetch, and a
 * record with a very short TTL could answer differently the second time.
 * Closing it fully means pinning the checked address for the connection, which
 * the global fetch does not expose.
 *
 * @param {URL} url - Resolved destination
 * @throws {Error} when the target is not permitted
 */
async function assertTargetAllowed(url) {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error(`Unsupported forward protocol: ${url.protocol}`);
  }

  if (FORWARD_ALLOW_PRIVATE) return;

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;

  if (net.isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      addresses = (await dns.lookup(hostname, { all: true })).map(entry => entry.address);
    } catch (error) {
      throw new Error(`Could not resolve forward target: ${hostname}`);
    }
  }

  const blocked = addresses.find(address => isPrivateAddress(address));
  if (blocked) {
    throw new Error(
      `Forwarding to private address ${blocked} is disabled. ` +
        'Set FORWARD_ALLOW_PRIVATE=true to permit it.'
    );
  }
}

module.exports = { assertTargetAllowed, isPrivateAddress, ALLOWED_PROTOCOLS };
