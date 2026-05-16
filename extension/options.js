const DEFAULT_SETTINGS = {
  enabled: true,
  blockedSites: []
};

const enabledToggle = document.querySelector("#enabledToggle");
const addSiteForm = document.querySelector("#addSiteForm");
const siteInput = document.querySelector("#siteInput");
const formMessage = document.querySelector("#formMessage");
const blockedList = document.querySelector("#blockedList");
const emptyState = document.querySelector("#emptyState");
const siteCount = document.querySelector("#siteCount");

let settings = DEFAULT_SETTINGS;

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

function isValidEntry(entry) {
  if (!entry || entry === "*" || entry.includes("..")) {
    return false;
  }

  return /^[a-z0-9*.-]+$/.test(entry) && entry.includes(".");
}

function getBlockedSites() {
  return Array.isArray(settings.blockedSites) ? settings.blockedSites : [];
}

function setMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-error", isError);
}

async function saveSettings(nextSettings) {
  settings = nextSettings;
  await chrome.storage.sync.set(nextSettings);
  render();
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
      await saveSettings({ ...settings, blockedSites: nextSites });
      setMessage(`已移除 ${site}`);
    });

    item.append(label, button);
    blockedList.append(item);
  }
}

async function loadSettings() {
  settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
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

  if (blockedSites.includes(entry)) {
    setMessage(`${entry} 已经在黑名单中。`, true);
    return;
  }

  const nextSites = [...blockedSites, entry].sort();
  await saveSettings({ ...settings, blockedSites: nextSites });
  siteInput.value = "";
  siteInput.focus();
  setMessage(`已添加 ${entry}`);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
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
