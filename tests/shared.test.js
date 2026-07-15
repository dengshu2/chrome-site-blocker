const { test } = require("node:test");
const assert = require("node:assert/strict");

require("../extension/shared.js");

const {
  DEFAULT_SETTINGS,
  MAX_BLOCKED_SITES,
  normalizeHost,
  isValidHostname,
  baseHostForRule,
  isValidEntry,
  matchesPattern,
  normalizeEntry,
  normalizeBlockedSites
} = globalThis.SiteBlockerShared;

test("exposes defaults", () => {
  assert.deepEqual(DEFAULT_SETTINGS, { enabled: true, blockedSites: [] });
  assert.equal(MAX_BLOCKED_SITES, 500);
});

test("normalizeHost lowercases and strips a trailing dot", () => {
  assert.equal(normalizeHost("Example.COM."), "example.com");
  assert.equal(normalizeHost("example.com"), "example.com");
});

test("isValidHostname accepts ordinary domains", () => {
  assert.equal(isValidHostname("example.com"), true);
  assert.equal(isValidHostname("sub.example.co.uk"), true);
  assert.equal(isValidHostname("xn--fsqu00a.xn--0zwm56d"), true);
});

test("isValidHostname rejects malformed input", () => {
  assert.equal(isValidHostname("localhost"), false, "single label");
  assert.equal(isValidHostname("a..com"), false, "empty label");
  assert.equal(isValidHostname("-bad.com"), false, "leading hyphen");
  assert.equal(isValidHostname("bad-.com"), false, "trailing hyphen");
  assert.equal(isValidHostname("exa mple.com"), false, "whitespace");
  assert.equal(isValidHostname(`${"a".repeat(64)}.com`), false, "label over 63 chars");
  assert.equal(isValidHostname(`${"a.".repeat(127)}com`), false, "hostname over 253 chars");
});

test("baseHostForRule strips the wildcard prefix and trims", () => {
  assert.equal(baseHostForRule("*.example.com"), "example.com");
  assert.equal(baseHostForRule("  Example.com. "), "example.com");
  assert.equal(baseHostForRule("example.com"), "example.com");
});

test("isValidEntry accepts plain and wildcard rules", () => {
  assert.equal(isValidEntry("example.com"), true);
  assert.equal(isValidEntry("*.example.com"), true);
});

test("isValidEntry rejects invalid rules", () => {
  assert.equal(isValidEntry(""), false);
  assert.equal(isValidEntry("*"), false);
  assert.equal(isValidEntry("*.com"), false, "wildcard base needs two labels");
  assert.equal(isValidEntry("foo*bar.com"), false, "inner wildcard");
  assert.equal(isValidEntry("a..com"), false);
  assert.equal(isValidEntry("localhost"), false);
});

test("matchesPattern matches the domain and its subdomains for both rule forms", () => {
  for (const rule of ["example.com", "*.example.com"]) {
    assert.equal(matchesPattern("example.com", rule), true, `${rule} exact`);
    assert.equal(matchesPattern("a.example.com", rule), true, `${rule} subdomain`);
    assert.equal(matchesPattern("a.b.example.com", rule), true, `${rule} nested subdomain`);
    assert.equal(matchesPattern("EXAMPLE.COM.", rule), true, `${rule} case and trailing dot`);
  }
});

test("matchesPattern does not match lookalike or sibling domains", () => {
  assert.equal(matchesPattern("notexample.com", "example.com"), false);
  assert.equal(matchesPattern("example.com.evil.net", "example.com"), false);
  assert.equal(matchesPattern("example.org", "example.com"), false);
});

test("matchesPattern rejects invalid patterns outright", () => {
  assert.equal(matchesPattern("example.com", "foo*bar.com"), false);
  assert.equal(matchesPattern("example.com", "*"), false);
  assert.equal(matchesPattern("example.com", ""), false);
});

test("normalizeEntry extracts the hostname from URLs and host:port input", () => {
  assert.equal(normalizeEntry("https://YouTube.com/watch?v=1"), "youtube.com");
  assert.equal(normalizeEntry("example.com:8080/path"), "example.com");
  assert.equal(normalizeEntry("  example.com.  "), "example.com");
  assert.equal(normalizeEntry("*.Example.COM"), "*.example.com");
  assert.equal(normalizeEntry(""), "");
});

test("normalizeEntry converts IDN input to punycode", () => {
  assert.equal(normalizeEntry("例子.测试"), "xn--fsqu00a.xn--0zwm56d");
});

test("normalizeBlockedSites dedupes, drops invalid entries, and caps the list", () => {
  assert.deepEqual(
    normalizeBlockedSites([
      "Example.com",
      "example.com",
      "*.example.com",
      "not a domain",
      "localhost",
      42,
      null,
      "b.org."
    ]),
    ["example.com", "*.example.com", "b.org"]
  );

  const oversized = Array.from({ length: MAX_BLOCKED_SITES + 10 }, (_v, i) => `site-${i}.com`);
  assert.equal(normalizeBlockedSites(oversized).length, MAX_BLOCKED_SITES);
});
