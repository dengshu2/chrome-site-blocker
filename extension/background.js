const DEFAULT_SETTINGS = {
  enabled: true,
  blockedSites: []
};

const RULE_ID_START = 1000;

async function getSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS);
}

function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hostPatternToRegex(pattern) {
  const rule = normalizeHost(pattern.trim());

  if (!rule) {
    return "";
  }

  if (rule.startsWith("*.")) {
    const base = escapeRegExp(rule.slice(2));
    return `([^/?#:]+\\.)*${base}`;
  }

  if (rule.includes("*")) {
    return rule.split("*").map(escapeRegExp).join("[^/?#:]*");
  }

  return `([^/?#:]+\\.)*${escapeRegExp(rule)}`;
}

function ruleForSite(site, index) {
  const hostRegex = hostPatternToRegex(site);
  const redirectUrl = `${chrome.runtime.getURL("blocked.html")}#\\0`;

  return {
    id: RULE_ID_START + index,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: redirectUrl
      }
    },
    condition: {
      regexFilter: `^https?://${hostRegex}([/?#:].*)?$`,
      resourceTypes: ["main_frame"]
    }
  };
}

async function syncBlockingRules() {
  const { enabled, blockedSites } = await getSettings();
  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = currentRules.map((rule) => rule.id);
  const sites = Array.isArray(blockedSites) ? blockedSites : [];
  const addRules = enabled ? sites.map(ruleForSite) : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

chrome.runtime.onInstalled.addListener(syncBlockingRules);
chrome.runtime.onStartup.addListener(syncBlockingRules);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || (!changes.enabled && !changes.blockedSites)) {
    return;
  }

  syncBlockingRules();
});

syncBlockingRules();
