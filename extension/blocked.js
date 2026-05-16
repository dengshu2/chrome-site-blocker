const params = new URLSearchParams(location.search);
const redirectedUrl = location.hash.length > 1 ? location.hash.slice(1) : "";
const originalUrl = params.get("url") || redirectedUrl;
let site = params.get("site") || params.get("rule") || "当前网站";

if (!params.has("site") && originalUrl) {
  try {
    site = new URL(originalUrl).hostname;
  } catch {
    site = "当前网站";
  }
}

document.querySelector("#blockedSite").textContent = site;
document.querySelector("#blockedUrl").textContent = originalUrl;

document.querySelector("#backButton").addEventListener("click", () => {
  history.length > 1 ? history.back() : chrome.runtime.openOptionsPage();
});

document.querySelector("#optionsButton").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
