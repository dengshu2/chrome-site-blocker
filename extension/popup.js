const {
  DEFAULT_SETTINGS,
  MAX_BLOCKED_SITES,
  normalizeHost,
  baseHostForRule,
  isValidEntry,
  matchesPattern,
  normalizeEntry
} = globalThis.SiteBlockerShared;

const state = {
  tab: null,
  host: "",
  settings: DEFAULT_SETTINGS
};

const enabledToggle = document.querySelector("#enabledToggle");
const currentHost = document.querySelector("#currentHost");
const currentStatus = document.querySelector("#currentStatus");
const toggleSiteButton = document.querySelector("#toggleSiteButton");
const openOptionsButton = document.querySelector("#openOptionsButton");

function getBlockedSites() {
  return Array.isArray(state.settings.blockedSites) ? state.settings.blockedSites : [];
}

function findMatchingRule(hostname) {
  return getBlockedSites().find((site) => matchesPattern(hostname, site));
}

function findDirectRule(hostname) {
  const host = normalizeHost(hostname);

  return getBlockedSites().find((site) => baseHostForRule(site) === host);
}

function blockedPageUrl(originalUrl, hostname) {
  const page = new URL(chrome.runtime.getURL("blocked.html"));
  page.searchParams.set("site", hostname);
  page.searchParams.set("url", originalUrl);
  return page.href;
}

async function loadState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tab = tab;
  state.settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  enabledToggle.checked = Boolean(state.settings.enabled);

  if (!tab?.url || (!tab.url.startsWith("http://") && !tab.url.startsWith("https://"))) {
    state.host = "";
    renderUnsupportedTab();
    return;
  }

  state.host = normalizeHost(new URL(tab.url).hostname);
  renderCurrentSite();
}

function renderUnsupportedTab() {
  currentHost.textContent = "此页面不可管理";
  currentStatus.textContent = "Chrome 内部页、扩展页和本地文件不会被加入黑名单。";
  toggleSiteButton.disabled = true;
}

function renderCurrentSite() {
  const matchingRule = findMatchingRule(state.host);
  const directRule = findDirectRule(state.host);

  currentHost.textContent = state.host;
  currentStatus.textContent = matchingRule
    ? `这个网站会被 ${matchingRule} 规则拦截。`
    : "这个网站还没有加入黑名单。";
  toggleSiteButton.textContent = matchingRule && !directRule ? "管理规则" : matchingRule ? "移出黑名单" : "加入黑名单";
  toggleSiteButton.disabled = false;
}

async function syncRules() {
  const response = await chrome.runtime.sendMessage({ type: "syncRules" });

  if (!response?.ok) {
    throw new Error(response?.error || "规则同步失败。");
  }
}

async function setBlockedSites(blockedSites) {
  const previousSettings = state.settings;
  const nextSettings = { ...state.settings, blockedSites };

  try {
    state.settings = nextSettings;
    await chrome.storage.local.set({ blockedSites });
    await syncRules();
  } catch (error) {
    state.settings = previousSettings;
    await chrome.storage.local.set({ blockedSites: previousSettings.blockedSites });
    await syncRules().catch(() => {});
    renderCurrentSite();
    currentStatus.textContent = `保存失败：${error?.message || "请稍后重试。"}`;
    return false;
  }

  renderCurrentSite();
  return true;
}

enabledToggle.addEventListener("change", async () => {
  const enabled = enabledToggle.checked;
  state.settings = { ...state.settings, enabled };

  try {
    await chrome.storage.local.set({ enabled });
    await syncRules();
  } catch (error) {
    enabledToggle.checked = !enabled;
    state.settings = { ...state.settings, enabled: !enabled };
    await chrome.storage.local.set({ enabled: !enabled }).catch(() => {});
    await syncRules().catch(() => {});
    currentStatus.textContent = `保存失败：${error?.message || "请稍后重试。"}`;
  }
});

toggleSiteButton.addEventListener("click", async () => {
  if (!state.host) {
    return;
  }

  const blockedSites = getBlockedSites();
  const matchingRule = findMatchingRule(state.host);
  const directRule = findDirectRule(state.host);

  if (matchingRule && !directRule) {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (directRule) {
    await setBlockedSites(blockedSites.filter((site) => site !== directRule));
    return;
  }

  const entry = normalizeEntry(state.host);

  if (!isValidEntry(entry)) {
    currentStatus.textContent = "当前网站不是可屏蔽的有效域名。";
    return;
  }

  if (blockedSites.length >= MAX_BLOCKED_SITES) {
    currentStatus.textContent = `黑名单最多支持 ${MAX_BLOCKED_SITES} 个网站。`;
    return;
  }

  const nextSites = [...blockedSites, entry].sort();
  const saved = await setBlockedSites(nextSites);

  if (saved && state.settings.enabled && state.tab?.id && state.tab.url) {
    await chrome.tabs.update(state.tab.id, {
      url: blockedPageUrl(state.tab.url, state.host)
    });
    window.close();
  }
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

loadState();
