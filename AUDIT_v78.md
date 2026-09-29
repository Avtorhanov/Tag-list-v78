# Tag list v78 — UI/UX, performance and reliability audit

## Architecture
- Runtime code is split into six functional boundaries plus `ocr-utils.js`: storage/state, tag rendering/selection, export/share, OCR utilities, OCR runtime, import, and UI/bootstrap.
- `index.html` loads the modules with `defer` in dependency order.
- The previous monolithic `js/app.js` is removed from the runtime and service-worker precache.
- Exported standalone HTML now inlines the same modular runtime in the same order, so the export/new-document path follows the source architecture.

## UX changes
- Search closes automatically when the last character is deleted. The query is reset and the list is rendered in the next animation frame.
- Status changes retain haptic feedback where the browser exposes `navigator.vibrate`.
- Status strike-through uses a short transform animation and is applied only when the status actually changes.
- Bulk “Выполнить выбранные” keeps selection semantics separate from status semantics.

## Visual refinement
- Tab/page outlines have slightly deeper contrast and restrained shadowing.
- Accent colors are more saturated without changing the existing theme structure.
- Motion remains short and respects `prefers-reduced-motion`.

## Performance/reliability
- Event delegation remains used for the tag list instead of per-row listeners.
- `content-visibility:auto` remains enabled for rows where supported.
- Search rendering remains coalesced through `requestAnimationFrame`.
- Service-worker precache now references the actual modular files and uses a new cache name.
- OCR is kept as a separate module; OCR network work still starts only from an explicit OCR action.

## Verification
- All JavaScript modules pass Node.js syntax validation.
- No runtime reference to the removed `js/app.js` remains in `index.html`, `sw.js`, or the JS modules.
- The optional `exportPageButtons` element is guarded by a null check and therefore does not affect the current UI.

## Preserved behavior
Existing page management, tag selection, selection clearing, completion/reset actions, tasks, manual editing, duplicate handling, OCR/import flows, themes, fonts, PWA installation, local persistence, export, sharing, and state-link restoration were not intentionally redesigned.
