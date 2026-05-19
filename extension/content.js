(async () => {
  if (window !== window.top) return;

  const { enabled, blockedSites } = await chrome.storage.local.get({
    enabled: true,
    blockedSites: []
  });

  if (!enabled || !Array.isArray(blockedSites) || blockedSites.length === 0) {
    return;
  }

  const hostname = location.hostname.toLowerCase().replace(/\.$/, "");

  function matchesRule(host, rule) {
    const r = rule.toLowerCase().trim();
    if (r.startsWith("*.")) {
      const base = r.slice(2);
      return host === base || host.endsWith(`.${base}`);
    }
    return host === r || host.endsWith(`.${r}`);
  }

  const matchingRule = blockedSites.find(site => matchesRule(hostname, site));

  if (matchingRule) {
    location.replace(chrome.runtime.getURL(
      `blocked.html?rule=${encodeURIComponent(matchingRule)}&url=${encodeURIComponent(location.href)}`
    ));
  }
})();
