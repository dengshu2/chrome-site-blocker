importScripts("shared.js");

const {
  DEFAULT_SETTINGS,
  MAX_BLOCKED_SITES,
  baseHostForRule,
  normalizeBlockedSites
} = globalThis.SiteBlockerShared;

const RULE_ID_START = 1000;
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
      requestDomains: [baseHost],
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
