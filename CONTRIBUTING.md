# Contributing

Thanks for helping improve Chrome Site Blocker.

## Development

1. Load `extension/` in `chrome://extensions` with Developer mode enabled.
2. Make your changes.
3. Click Reload on the extension card.
4. Test popup, options page, and blocked page behavior.

## Packaging

Run:

```sh
./scripts/package.sh
```

This creates `dist/site-blocker-extension.zip`.

## Pull Requests

Before opening a pull request:

- Keep permissions as narrow as possible.
- Do not commit generated packages, `.crx` files, or private keys.
- Update `PRIVACY.md` if data handling changes.
- Update `CHANGELOG.md` for user-visible changes.
