# CMake GUI Editor

A visual, lossless editor for `CMakeLists.txt` and `*.cmake` files inside VS Code.  
Open any CMake file as a **GUI** and edit common parts — project metadata, target dependencies,
and include directories — without fighting raw CMake syntax. Everything else is preserved byte-for-byte.

> **No managed regions required.** The whole file is parsed; unknown or complex parts are shown read-only and kept as-is.

---

## Features

### Visual editor — three panels

| Panel | What you can edit |
|---|---|
| **Project** | `cmake_minimum_required(VERSION …)`, `project(…)`, `set(CMAKE_CXX_STANDARD …)` |
| **Target** | Source files (read-only), `target_link_libraries(… PRIVATE …)`, `target_include_directories(… PRIVATE …)` |
| **Unparsed Content** | Read-only view of anything not yet modelled — preserved verbatim on Apply |

### Opening the editor

- **Right-click** `CMakeLists.txt` in the Explorer → **Open with CMake GUI (Visual)**
- **Editor title bar** button (when a CMake file is active)
- **Command Palette** `Ctrl+Shift+P` → **CMake GUI: Open Visual Editor**
- **Custom editor selector** — VS Code prompts automatically when you open a `.cmake` / `CMakeLists.txt`

### Diff & apply flow

Clicking **Apply Changes** shows a single, in-memory diff tab — no temp files on disk. Confirm to write; cancel to discard. The diff tab is cleaned up automatically.

### Field-level dirty tracking

Modified fields are highlighted amber. The Apply button gains an amber ring when anything has changed.

### Managed regions

`Ctrl+Shift+P` → **CMake GUI: Insert Managed Region** stamps a `# === cmake-builder:begin/end ===` block at the cursor. Content inside managed regions is filtered from the Unparsed panel.

---

## Getting started

1. Open a workspace that contains a `CMakeLists.txt`.
2. Right-click the file → **Open with CMake GUI (Visual)** (or use the command palette).
3. Edit project fields or select a target and update its libraries / include dirs.
4. Click **Apply Changes** → review the diff → **Apply** to save.

---

## How it works

- The extension tokenizes the CMake file into **commands** and **raw** spans while tracking byte offsets.
- It builds a small model (project meta, targets, `target_link_libraries`, `target_include_directories`) and populates the GUI.
- On **Apply**, only the relevant commands are replaced or inserted in place; all other text is left untouched.
- Edits are applied end → start to ensure byte offsets stay valid.
- The diff is powered by an **in-memory content provider** — no stray tabs or temp files remain after you apply or cancel.

---

## Supported edits

| Command | GUI action |
|---|---|
| `cmake_minimum_required(VERSION …)` | Edit or insert |
| `project(…)` | Edit or insert |
| `set(CMAKE_CXX_STANDARD …)` | Edit; inserts `CMAKE_CXX_STANDARD_REQUIRED ON` when creating new |
| `target_link_libraries(… PRIVATE …)` | Edit per-target; inserts if absent |
| `target_include_directories(… PRIVATE …)` | Edit per-target; inserts if absent |

Everything else is preserved. Common commands (`target_compile_definitions`, `install`, `option`, `find_package`, `add_subdirectory`, control flow, custom functions/macros, etc.) are recognised as "supported for preservation" and won't appear in the Unparsed panel.

---

## Commands

| Command | ID | Description |
|---|---|---|
| CMake GUI: Open Visual Editor | `cmake-gui-editor.openVisual` | Opens the current/selected CMake file in the GUI |
| CMake GUI: Insert Managed Region | `cmake-gui-editor.insertManagedRegion` | Stamps a `cmake-builder:begin/end` region at the cursor |

Context menus added:
- **Explorer** → Open with CMake GUI (Visual)
- **Editor title** → Open with CMake GUI (Visual)
- **Editor context** → Open with CMake GUI (Visual) / Insert Managed Region

_Tip:_ Bind a key via **Keyboard Shortcuts → search "CMake GUI"_.

---

## Requirements

- VS Code `^1.103.0`
- No required dependencies.  
  Optional: **CMake Tools** for configure/build/debug; this extension focuses purely on editing CMake files.

> The extension activates automatically when your workspace contains a `CMakeLists.txt` or `*.cmake` file — no CMake language extension required.

---

## Extension settings

None. Sensible defaults are used throughout.

---

## Known issues

- Target detection is conservative. Unusual target definitions (generated names, heavy macro indirection) may not appear in the target dropdown.
- Editing currently handles a single normalised `target_link_libraries` / `target_include_directories` block per target (existing duplicate blocks are collapsed into one).
- Formatting of rewritten commands is normalised; whitespace inside modified commands may differ from your original style.
- Very exotic bracket-arguments or deeply nested custom macro structures might confuse the balanced-parentheses scanner. Please file examples.
- `MODULE` and `OBJECT` library targets are parsed correctly but the GUI currently treats them the same as `library`.

---

## Troubleshooting

- **The GUI command doesn't appear** — reload the window. The extension activates on `onLanguage:cmake` and `workspaceContains:**/CMakeLists.txt`, so no additional language extension is required.
- **Webview is blank** — open **Help → Toggle Developer Tools** and check the Console for errors. Ensure `media/index.html` and `media/app.js` were packaged (verify `"files"` in `package.json` includes `media/**`).
- **No targets listed** — confirm your targets use standard `add_executable(…)` / `add_library(…)` syntax. Macro-wrapped targets are not yet detected. Please file a snippet.

---

## Release notes

### 1.0.0
- Full GUI redesign: three-panel layout, topbar, source chips, kind badge, dirty highlighting
- New: editable include directories per target
- New: source files displayed as animated chips (read-only)
- New: `insertManagedRegion` command implemented
- New: extension icon
- Fixed 7 bugs (Range end, unregistered command, spurious cxxStandard writes, comment-paren segmenter, multi-TLL replacement, URI comparison, activation events)

### 0.0.1
- First development preview

---

## Roadmap

- Edit `target_compile_definitions` and `target_compile_options` per target
- Multi-target bulk editing in one view
- Smarter parsing of macro-wrapped targets
- Source file editing (add/remove from `add_executable` / `add_library`)
- Optional formatting-preservation heuristics for replaced blocks

---

## License

MIT