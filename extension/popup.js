const DEFAULT_SETTINGS = {
  enabled: true,
  blockedSites: []
};

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

function normalizeEntry(value) {
  const text = value.trim().toLowerCase();

  if (!text) {
    return "";
  }

  const withProtocol = text.includes("://") ? text : `https://${text}`;

  try {
    return new URL(withProtocol).hostname.replace(/\.$/, "");
  } catch {
    return text.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  }
}

function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesPattern(hostname, pattern) {
  const host = normalizeHost(hostname);
  const rule = normalizeHost(pattern.trim());

  if (!rule) {
    return false;
  }

  if (rule.startsWith("*.")) {
    const base = rule.slice(2);
    return host === base || host.endsWith(`.${base}`);
  }

  if (rule.includes("*")) {
    const expression = `^${rule.split("*").map(escapeRegExp).join(".*")}$`;
    return new RegExp(expression).test(host);
  }

  return host === rule || host.endsWith(`.${rule}`);
}

function getBlockedSites() {
  return Array.isArray(state.settings.blockedSites) ? state.settings.blockedSites : [];
}

function isHostBlocked(hostname) {
  return getBlockedSites().some((site) => matchesPattern(hostname, site));
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
  state.settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
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
  const blocked = isHostBlocked(state.host);

  currentHost.textContent = state.host;
  currentStatus.textContent = blocked
    ? "这个网站已经在黑名单中，访问时会被拦截。"
    : "这个网站还没有加入黑名单。";
  toggleSiteButton.textContent = blocked ? "移出黑名单" : "加入黑名单";
  toggleSiteButton.disabled = false;
}

async function setBlockedSites(blockedSites) {
  state.settings = { ...state.settings, blockedSites };
  await chrome.storage.sync.set({ blockedSites });
  renderCurrentSite();
}

enabledToggle.addEventListener("change", async () => {
  const enabled = enabledToggle.checked;
  state.settings = { ...state.settings, enabled };
  await chrome.storage.sync.set({ enabled });
});

toggleSiteButton.addEventListener("click", async () => {
  if (!state.host) {
    return;
  }

  const blockedSites = getBlockedSites();

  if (isHostBlocked(state.host)) {
    await setBlockedSites(blockedSites.filter((site) => !matchesPattern(state.host, site)));
    return;
  }

  const nextSites = [...blockedSites, normalizeEntry(state.host)].sort();
  await setBlockedSites(nextSites);

  if (state.settings.enabled && state.tab?.id && state.tab.url) {
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
