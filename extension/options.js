const {
  DEFAULT_SETTINGS,
  MAX_BLOCKED_SITES,
  isValidEntry,
  normalizeEntry
} = globalThis.SiteBlockerShared;

const enabledToggle = document.querySelector("#enabledToggle");
const addSiteForm = document.querySelector("#addSiteForm");
const siteInput = document.querySelector("#siteInput");
const formMessage = document.querySelector("#formMessage");
const blockedList = document.querySelector("#blockedList");
const emptyState = document.querySelector("#emptyState");
const siteCount = document.querySelector("#siteCount");

let settings = DEFAULT_SETTINGS;

function getBlockedSites() {
  return Array.isArray(settings.blockedSites) ? settings.blockedSites : [];
}

function setMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-error", isError);
}

async function syncRules() {
  const response = await chrome.runtime.sendMessage({ type: "syncRules" });

  if (!response?.ok) {
    throw new Error(response?.error || "规则同步失败。");
  }
}

async function saveSettings(nextSettings, successMessage = "") {
  const previousSettings = settings;

  try {
    settings = nextSettings;
    await chrome.storage.local.set(nextSettings);
    render();
    await syncRules();

    if (successMessage) {
      setMessage(successMessage);
    }

    return true;
  } catch (error) {
    settings = previousSettings;
    await chrome.storage.local.set(previousSettings).catch(() => {});
    await syncRules().catch(() => {});
    render();
    setMessage(`保存失败：${error?.message || "请稍后重试。"}`, true);
    return false;
  }
}

function render() {
  const blockedSites = getBlockedSites();

  enabledToggle.checked = Boolean(settings.enabled);
  siteCount.textContent = `${blockedSites.length} 个网站`;
  blockedList.replaceChildren();
  emptyState.classList.toggle("is-visible", blockedSites.length === 0);

  for (const site of blockedSites) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const button = document.createElement("button");

    label.textContent = site;
    button.type = "button";
    button.textContent = "移除";
    button.addEventListener("click", async () => {
      const nextSites = getBlockedSites().filter((candidate) => candidate !== site);
      await saveSettings({ ...settings, blockedSites: nextSites }, `已移除 ${site}`);
    });

    item.append(label, button);
    blockedList.append(item);
  }
}

async function loadSettings() {
  settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  render();
}

enabledToggle.addEventListener("change", async () => {
  await saveSettings({ ...settings, enabled: enabledToggle.checked });
});

addSiteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const entry = normalizeEntry(siteInput.value);

  if (!isValidEntry(entry)) {
    setMessage("请输入有效域名，例如 youtube.com 或 *.example.com。", true);
    return;
  }

  const blockedSites = getBlockedSites();

  if (blockedSites.length >= MAX_BLOCKED_SITES) {
    setMessage(`黑名单最多支持 ${MAX_BLOCKED_SITES} 个网站。`, true);
    return;
  }

  if (blockedSites.includes(entry)) {
    setMessage(`${entry} 已经在黑名单中。`, true);
    return;
  }

  const nextSites = [...blockedSites, entry].sort();
  const saved = await saveSettings({ ...settings, blockedSites: nextSites }, `已添加 ${entry}`);

  if (saved) {
    siteInput.value = "";
    siteInput.focus();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  settings = {
    ...settings,
    ...Object.fromEntries(
      Object.entries(changes).map(([key, change]) => [key, change.newValue])
    )
  };
  render();
});

loadSettings();
