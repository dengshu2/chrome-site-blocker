// Fallback blocker for navigations that slip past declarativeNetRequest
// (e.g. served from the back/forward or service-worker cache before dynamic
// rules are re-evaluated). shared.js is injected before this file.
(async () => {
  if (window !== window.top) return;

  const { normalizeHost, matchesPattern } = globalThis.SiteBlockerShared;

  const { enabled, blockedSites } = await chrome.storage.local.get({
    enabled: true,
    blockedSites: []
  });

  if (!enabled || !Array.isArray(blockedSites) || blockedSites.length === 0) {
    return;
  }

  const hostname = normalizeHost(location.hostname);
  const matchingRule = blockedSites.find((site) => matchesPattern(hostname, site));

  if (matchingRule) {
    location.replace(chrome.runtime.getURL(
      `blocked.html?rule=${encodeURIComponent(matchingRule)}&url=${encodeURIComponent(location.href)}`
    ));
  }
})();
