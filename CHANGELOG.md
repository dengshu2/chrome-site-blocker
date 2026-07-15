# Changelog

## 0.1.3 - 2026-07-14

- Extracted shared domain helpers into `shared.js`, removing four duplicated copies of the validation and matching logic.
- Narrowed `web_accessible_resources` to only `blocked.html` to shrink the extension-fingerprinting surface.
- Declared `minimum_chrome_version` 101, required by `requestDomains` rule conditions.
- Removed the unused hash-based URL fallback on the blocked page.
- Fixed packaging to exclude nested `.DS_Store` files and the extension README from the store zip.
- Added unit tests, ESLint, and a GitHub Actions CI workflow.

## 0.1.2 - 2026-05-19

- Switched dynamic rules from `urlFilter` to `requestDomains` so short domains such as `x.com` are blocked reliably.
- Added a content-script fallback that blocks pages served from caches before dynamic rules are evaluated.

## 0.1.1 - 2026-05-16

- Serialized dynamic rule sync to avoid duplicate-rule-ID races.
- Switched settings storage from Chrome sync storage to local extension storage.
- Added one-time migration for settings saved by earlier sync-storage builds.
- Replaced regex-only blocking rules with simpler dynamic URL filter rules.
- Added save-time rule synchronization checks and user-facing save errors.
- Tightened blocked-site validation to ordinary domains and `*.domain` rules.
- Improved popup behavior when a site is blocked by a parent-domain rule.
- Updated packaging to avoid stale `.crx` artifacts.

## 0.1.0 - 2026-05-16

- Added Chrome Manifest V3 extension shell.
- Added popup controls for blocking or unblocking the current site.
- Added options page for managing blocked domains.
- Added blocked-page redirect experience.
- Added dynamic `declarativeNetRequest` rules for configured sites.
