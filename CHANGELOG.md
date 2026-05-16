# Changelog

## 0.1.1 - 2026-05-16

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
