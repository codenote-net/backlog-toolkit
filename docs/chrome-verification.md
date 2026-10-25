# Chrome verification

Verified on 2026-10-25–26 with an authenticated Backlog project and the unpacked extension. Private space configuration stays in the ignored `config.local.json`; screenshots remain outside the repository. No private space URL, organization name, or issue title is included here.

## Results

| Check | Result |
| --- | --- |
| Local demo suite | All nine checks passed before real-space testing; disabling the demo extension produced the expected failures. |
| Issue attachment network interception | A harmless 69-byte text baseline reached `/AddAttachmentAsync.action` with HTTP 200. After enabling the rule, Chrome Network showed `(blocked:other)` and 0 B transferred. No issue was submitted. |
| Comment attachment network interception | File selection before comment submission triggered the same route, which Chrome blocked with 0 B transferred. No comment was submitted. |
| Wiki attachment network interception | Discovered `/AddWikiAttachmentAsync.action`, added it to configuration, and repeated file selection. The extension's own rule-match notification confirmed blocking. |
| Shared-file network interception | Discovered `/r/files/addSharedFile`, added it to configuration, and repeated file selection. The extension's own rule-match notification confirmed blocking. |
| Upload controls | Native file inputs and configured issue, comment, Wiki, and shared-file controls were hidden and disabled. |
| Plain-text clipboard paste and preview | Issue text paste and comment preview worked; neither issue nor comment was submitted. |
| Image clipboard paste | Native image paste in issue and comment editors displayed the extension's blocking notice; no image was inserted. |
| Native OS drag-and-drop | User reported a manual check that appeared to block the file. Agent automation did not independently confirm this gesture. Synthetic drop interception passed in the local demo. |
| Navigation and reload | Wiki and shared-file controls remained restricted. Wiki notice count remained stable across reload. |
| Download | The harmless shared-file fixture downloaded successfully; its bytes matched the original. |
| Out-of-scope local page | With only the production extension active, localhost upload POSTs reached the server, file inputs remained available, and text/comment/GET requests worked. Expected demo guard failures confirmed that production protection did not apply there. |
| Notice attribution | Persistent policy notice, gesture toast, and confirmed network-block notice were visible. Backlog's own error remained visible. Automated checks cover rule ownership, originating frame, and unavailable debug-event handling. |
| Automated regression tests | Eight tests passed, including all four configured paths, exact origin/path boundaries, POST-only behavior, and notification routing. |

## Method and test artifacts

Network interception was checked independently of UI suppression by temporarily changing only generated output to keep the native file controls available while retaining network rules and rule-match notifications. Source protections were unchanged. The normal build was restored, the extension reloaded, and the issue page reloaded after these checks.

The initial public API rule alone did not cover the observed web UI upload routes. The shared-file and Wiki discovery attempts each created one harmless text fixture before their missing paths were added. Both fixtures were deleted with user confirmation on 2026-10-26. The Wiki attachment count returned to zero, and the shared-file list displayed a deletion confirmation with the fixture absent. The initial issue baseline also uploaded a temporary attachment on an unsaved form; server-side cleanup of that object was not verified. No issue, comment, or Wiki body edit was submitted.

Exact network attribution uses the unpacked-only `onRuleMatchedDebug` event and the extension's own ruleset. Generic page errors are not used as evidence of blocking.

## Remaining coverage

- Actual issue creation/editing, comment submission, and Wiki body saves; current real-space testing stops before submission.
- A generic network/server failure in the real UI to confirm it does not show a falsely attributed block notice; only the notification source and unrelated-rule behavior have been checked automatically.
- Another authenticated, unconfigured Backlog space. Exact-origin isolation has automated coverage and localhost has browser coverage.
- Document uploads, any additional upload routes, and Edge.

The configuration applies to the entire configured space, not only the project used for verification. This remains a proof of concept rather than complete enforcement. No PR has been created.
