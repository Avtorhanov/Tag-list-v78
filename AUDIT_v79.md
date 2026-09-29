# Tag list v79 — точечный UI/UX audit

- Dark themes converted to graphite/anthracite/steel palette; legacy theme keys are mapped without purple colors.
- Send arrow uses inline SVG and is independent of document font selection.
- Export menu action «Текущий файл» replaced by «Актуал» and sends current state link.
- Selection footer hides global select/reset controls during multi-selection; only «Выполнить» and «Удалить» remain. Individual tag X still controls deselection.
- Long inactive page names are shortened before the first digit; active names remain horizontally scrollable.
- Upper menu blocks receive small vertical compression only; widths are unchanged.
- Existing v78 modules retained; no new framework/runtime dependency introduced.
