# Change Log

All notable changes to "CMake GUI Editor" are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [1.0.0] — 2026-08-01

### Added
- **Include Directories editing** — per-target editable textarea for `target_include_directories(PRIVATE …)`.
- **Source files display** — source files from `add_executable` / `add_library` shown as visual chips in the target panel.
- **Target kind badge** — shows `EXECUTABLE` or `LIBRARY` next to the target selector.
- **Managed region command** — `CMake GUI: Insert Managed Region` stamps a `# === cmake-builder:begin/end ===` block at the cursor, with indent-aware snippet placement.
- **Field-level dirty highlighting** — each field turns amber when its value differs from the file; the Apply button gains an amber ring.
- **Status bar feedback** — "Proposing diff…" / "No changes" inline messages in the topbar.
- **Empty-state panel** — helpful message when no `add_executable` / `add_library` targets are found.
- **Extension icon** — 128×128 icon shown in the VS Code marketplace and Extensions panel.
- **Additional activation events** — `workspaceContains:**/CMakeLists.txt` and `workspaceContains:**/*.cmake` so the extension activates even without a CMake language extension installed.
- **`insertManagedRegion` in editor context menu** — available alongside "Open Visual Editor" when right-clicking a CMake file.

### Fixed
- **Bug 1 — `edit.replace` range off-by-one**: End range was `(lineCount, 0)` (one past the document); corrected to `(lineCount - 1, lastLineLength)`.
- **Bug 2 — `insertManagedRegion` unregistered**: Command declared in `package.json` but never registered; now fully implemented.
- **Bug 3 — Spurious `cxxStandard` write-back**: Dropdown defaulted to `'17'` and always sent a value, inserting `set(CMAKE_CXX_STANDARD 17)` unexpectedly. Now defaults to `''` (unchanged) and only writes when the user explicitly picks a value.
- **Bug 4 — Comment parens confuse segmenter**: `findCloseParen` didn't handle `#` line comments, so `)` inside a comment could prematurely end argument parsing. Comments are now skipped. Additionally, regex matches that fall after a `#` on the same line are skipped.
- **Bug 5 — Only first `target_link_libraries` block replaced**: Multiple TLL blocks for the same target were left as stale duplicates. Now all blocks are found; the first is replaced with the new content, extras are deleted.
- **Bug 8 — Missing activation without CMake language extension**: Added `workspaceContains` activation events.
- **Bug 9 — URI comparison used `String()` instead of `.toString()`**: Diff tab could fail to close after apply/cancel; fixed to use `.toString()`.

### Changed
- **Complete GUI redesign**: three-column panel layout (Project / Target / Unparsed), VS Code theme token usage throughout, topbar with inline SVG logo + target selector, animated source chips, custom scrollbars.
- **`OBJECT`, `MODULE`, `ALIAS` target type keywords** now recognized in `add_library` parsing.
- **Multi-TLL merging** — when a target has multiple `target_link_libraries` blocks, the parser merges their libraries so the UI shows the complete picture.
- Version bumped from `0.0.1` → `1.0.0`.
- Display name updated to `CMake GUI Editor`.
- Added `keywords` and `Programming Languages` category to marketplace metadata.

---

## [0.0.1] — Initial development preview

- First working prototype
- Visual editor for project meta and per-target `target_link_libraries`
- In-memory diff and apply flow
- Explorer / editor context menu entries