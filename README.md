# Backlog Toolkit

An unofficial Chrome / Edge browser extension for Backlog, starting with accidental file upload prevention. Not affiliated with Nulab.

## What this proof of concept does

- Hides and disables file inputs, including dynamically inserted inputs.
- Hides additional upload controls identified by configured CSS selectors.
- Intercepts file drops and file/image pastes while allowing text-only pastes.
- Blocks POST requests to configured upload paths using Manifest V3 declarative network rules.
- Limits protection to explicitly configured Backlog spaces.

The example configuration covers four POST upload paths: `/api/v2/space/attachment`, `/AddAttachmentAsync.action` (issues/comments), `/AddWikiAttachmentAsync.action` (Wiki), and `/r/files/addSharedFile` (shared files), including query strings and a trailing slash. The three web UI routes were observed and blocked during real-space Chrome testing. **This is not complete upload prevention:** other routes and future UI changes still require inspection. See [Chrome verification](docs/chrome-verification.md) for evidence and remaining coverage.

## Quick start: local Chrome demo

Requires Node.js 22 or newer. No npm dependencies or API keys are needed.

```sh
npm test
npm run build:demo
npm run demo
```

1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Enable **Developer mode**.
3. Select **Load unpacked**, then select this repository's `dist/demo` directory.
4. Open <http://127.0.0.1:4173> and click **Run checks**.
5. Expect nine PASS results. The server's upload counter must not increase, while its comment counter increases by one. GET on the upload path must reach the fixture (404).
6. Try posting a text comment, pasting plain text, dragging a harmless file onto the drop zone, and pasting an image. Files should trigger an extension notice; text should remain usable.
7. Disable the demo extension and reload the page. File controls should return and the upload-blocking checks should fail. Re-enable it and reload to restore protection.

The demo server listens only on `127.0.0.1:4173`, discards request bodies, and stores only in-memory request counts. Synthetic drop/paste checks do not replace manual OS clipboard and drag/drop testing. Chrome match patterns cannot restrict ports, so demo content-script permissions cover the loopback host; runtime checks and network rules restrict operation to port 4173. The production build does not include localhost access.

## Configure your Backlog space

```sh
cp config.example.json config.local.json
# Edit config.local.json with your exact space origin.
npm run build
```

Load `dist/backlog` as an unpacked extension. Reload existing Backlog tabs after installing, rebuilding, enabling, or disabling the extension.

```json
{
  "origins": ["https://your-space.backlog.com"],
  "uploadPaths": ["/api/v2/space/attachment", "/AddAttachmentAsync.action", "/AddWikiAttachmentAsync.action", "/r/files/addSharedFile"],
  "uploadSelectors": [".js_uploadBtn", "#attachFileButton", "#addAttachmentLink", "#addFileLink"]
}
```

Supported origins use HTTPS and a single space subdomain under `backlog.com`, `backlog.jp`, or `backlogtool.com`. Origins must not include paths, query strings, credentials, wildcards, or trailing slashes. `config.local.json` and `dist/` are gitignored to keep private space names out of commits.

Use Chrome DevTools Network in an authorized test project to identify each upload endpoint. Add only verified, exact upload paths to `uploadPaths`. Rules block POST only and apply to all network resource types. Do not add general issue/comment endpoints: doing so can prevent normal work. The example selectors cover observed issue, comment, Wiki, and shared-file upload controls. Inspect upload buttons and add precise CSS selectors to `uploadSelectors`; avoid matching whole forms or editors. Invalid selectors are ignored with a console warning.

## Manual acceptance checklist before a PR

- [ ] Chrome loads the extension without manifest or rule errors.
- [ ] Local checks pass with the demo extension enabled and fail as expected when disabled.
- [ ] Real file drag/drop and image paste are blocked; ordinary text paste works.
- [ ] Real-space issue creation, edits, comments, Wiki edits, and downloads still work.
- [ ] Uploads from issues, comments, Wiki, and shared files are blocked at the network layer.
- [ ] Dynamic page navigation does not restore file inputs.
- [ ] An unconfigured Backlog space is unaffected.
- [ ] Edge is tested separately before claiming Edge support.

Do not assume a failed upload is proof of blocking: inspect DevTools for `ERR_BLOCKED_BY_CLIENT` and check that a file was not created. Use harmless disposable files only in an authorized test project.

## Limitations and permissions

This is a browser-side accident-prevention tool, not a server authorization boundary. Disabling/removing the extension, using another browser or a direct API client, and mobile clients bypass it. Unlisted upload endpoints, non-POST upload protocols, custom editors, shadow DOM, and cross-origin frames are not guaranteed to be covered. Mixed clipboard content containing a file is blocked in full. Existing attachments are not removed.

The unpacked extension requests `declarativeNetRequestWithHostAccess`, `declarativeNetRequestFeedback`, and only the configured host permissions. It has no backend server, telemetry, storage, or API credentials. A local extension service worker forwards confirmed rule matches to the affected frame without sending URLs or file contents. Its content script accesses the configured page DOM to restrict controls and file events; network rules do not inspect request bodies. A visible upload button implemented by Backlog requires a verified selector even though native file inputs are hidden automatically.

## Development

- `src/content.js`: UI and clipboard/drop guard.
- `scripts/config.mjs`: configuration validation and scoped rule generation.
- `scripts/build.mjs`: dependency-free extension build.
- `demo/`: local fixture and browser checks.
- `test/`: scope and rule regression tests, run with `npm test`.

Build output uses separate directories for demo and real-space configurations. No PR should be created until the intended Chrome verification is complete.

References: [Chrome declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest), [Backlog attachment API](https://developer.nulab.com/docs/backlog/api/2/post-attachment-file/).

## License

[MIT](LICENSE)

## Upload restriction notices

A shield notice stays beside restricted attachment controls. File drops and image pastes show a dismissible 10-second notification. Confirmed network blocks also update the inline notice, while Backlog's own error remains visible. The current PoC uses Japanese notices on Backlog and English notices in the local demo.

**Unpacked PoC limitation:** exact network-block attribution uses `declarativeNetRequestFeedback` and `onRuleMatchedDebug`, which Chrome exposes only for unpacked extensions. It is not inferred from generic upload failures. Store distribution requires a separate notification design; UI notices and declarative blocking do not depend on this debug event. See [Chrome rule-match events](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#event-onRuleMatchedDebug).
