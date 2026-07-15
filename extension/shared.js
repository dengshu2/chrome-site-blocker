// Shared domain helpers for every extension context.
//
// Loaded as a plain script (no ES modules) so the same file works in:
// - the service worker via importScripts("shared.js")
// - popup/options pages via a <script> tag before their own script
// - the content script via the manifest "js" array, listed before content.js
// - Node.js unit tests via require(), reading globalThis.SiteBlockerShared
(() => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    blockedSites: []
  };

  const MAX_BLOCKED_SITES = 500;

  function normalizeHost(hostname) {
    return hostname.toLowerCase().replace(/\.$/, "");
  }

  function isValidHostname(hostname) {
    const labels = hostname.split(".");

    if (labels.length < 2 || hostname.length > 253) {
      return false;
    }

    return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  }

  function baseHostForRule(pattern) {
    const rule = normalizeHost(pattern.trim());

    return rule.startsWith("*.") ? rule.slice(2) : rule;
  }

  // Accepts "example.com" or "*.example.com". Both forms block the domain and
  // its subdomains, matching declarativeNetRequest requestDomains semantics.
  function isValidEntry(entry) {
    if (!entry) {
      return false;
    }

    if (entry.startsWith("*.")) {
      return isValidHostname(entry.slice(2));
    }

    if (entry.includes("*")) {
      return false;
    }

    return isValidHostname(entry);
  }

  // Both "example.com" and "*.example.com" match the domain and all of its
  // subdomains — mirroring declarativeNetRequest requestDomains semantics.
  function matchesPattern(hostname, pattern) {
    const host = normalizeHost(hostname);
    const base = baseHostForRule(pattern);

    if (base.includes("*") || !isValidHostname(base)) {
      return false;
    }

    return host === base || host.endsWith(`.${base}`);
  }

  // Turns free-form user input (URL, host with port/path, trailing dot, IDN)
  // into a candidate rule. Validation is a separate step via isValidEntry.
  function normalizeEntry(value) {
    const text = value.trim().toLowerCase();

    if (!text) {
      return "";
    }

    if (text.startsWith("*.")) {
      return `*.${normalizeEntry(text.slice(2))}`;
    }

    const withProtocol = text.includes("://") ? text : `https://${text}`;

    try {
      return new URL(withProtocol).hostname.replace(/\.$/, "");
    } catch {
      return text.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
    }
  }

  function normalizeBlockedSites(blockedSites) {
    const seen = new Set();
    const normalizedSites = [];

    for (const site of blockedSites) {
      const rule = normalizeHost(String(site || "").trim());
      const baseHost = baseHostForRule(rule);

      if (!isValidHostname(baseHost) || seen.has(rule)) {
        continue;
      }

      seen.add(rule);
      normalizedSites.push(rule);
    }

    return normalizedSites.slice(0, MAX_BLOCKED_SITES);
  }

  globalThis.SiteBlockerShared = {
    DEFAULT_SETTINGS,
    MAX_BLOCKED_SITES,
    normalizeHost,
    isValidHostname,
    baseHostForRule,
    isValidEntry,
    matchesPattern,
    normalizeEntry,
    normalizeBlockedSites
  };
})();
