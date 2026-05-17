const DEFAULT_SETTINGS = {
  enabled: true,
  blockedSites: []
};

const RULE_ID_START = 1000;
const MAX_BLOCKED_SITES = 500;
let legacyMigration;
let ruleSyncQueue = Promise.resolve();

async function getSettings() {
  await migrateLegacySyncSettings();
  return chrome.storage.local.get(DEFAULT_SETTINGS);
}

async function migrateLegacySyncSettings() {
  if (legacyMigration) {
    return legacyMigration;
  }

  legacyMigration = (async () => {
    const localSettings = await chrome.storage.local.get(["enabled", "blockedSites"]);

    if (localSettings.enabled !== undefined || localSettings.blockedSites !== undefined) {
      return;
    }

    const syncSettings = await chrome.storage.sync.get(["enabled", "blockedSites"]);

    if (syncSettings.enabled === undefined && syncSettings.blockedSites === undefined) {
      return;
    }

    await chrome.storage.local.set({
      ...DEFAULT_SETTINGS,
      ...syncSettings
    });
  })();

  return legacyMigration;
}

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

function ruleForSite(site, index) {
  const baseHost = baseHostForRule(site);

  return {
    id: RULE_ID_START + index,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        extensionPath: `/blocked.html?rule=${encodeURIComponent(site)}`
      }
    },
    condition: {
      urlFilter: `||${baseHost}^`,
      isUrlFilterCaseSensitive: false,
      resourceTypes: ["main_frame"]
    }
  };
}

function managedRuleIds() {
  return Array.from({ length: MAX_BLOCKED_SITES }, (_value, index) => RULE_ID_START + index);
}

async function syncBlockingRules() {
  const { enabled, blockedSites } = await getSettings();
  const sites = normalizeBlockedSites(Array.isArray(blockedSites) ? blockedSites : []);
  const addRules = enabled ? sites.map(ruleForSite) : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: managedRuleIds(),
    addRules
  });

  return {
    ruleCount: addRules.length,
    maxRuleCount: MAX_BLOCKED_SITES
  };
}

function queueRuleSync() {
  const syncTask = ruleSyncQueue.then(syncBlockingRules, syncBlockingRules);
  ruleSyncQueue = syncTask.catch(() => {});

  return syncTask;
}

function syncBlockingRulesSafely() {
  queueRuleSync().catch((error) => {
    console.error("Failed to sync blocking rules", error);
  });
}

chrome.runtime.onInstalled.addListener(syncBlockingRulesSafely);
chrome.runtime.onStartup.addListener(syncBlockingRulesSafely);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || (!changes.enabled && !changes.blockedSites)) {
    return;
  }

  syncBlockingRulesSafely();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "syncRules") {
    return false;
  }

  queueRuleSync()
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error?.message || String(error)
      });
    });

  return true;
});

syncBlockingRulesSafely();
