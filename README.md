# cmake-gui-editor

A visual, lossless editor for `CMakeLists.txt` and `*.cmake` inside VS Code.  
Open your CMake file in a **GUI** and edit common parts (version, project meta, target dependencies) without fighting syntax. Everything else is preserved byte-for-byte.

> No managed regions. The whole file is parsed; unknown or complex bits are shown read-only and kept as-is.

---

## Features

- **Open as a GUI**  
  Right-click `CMakeLists.txt` → **Open with CMake GUI (Visual)**, or run the command from the palette.

- **Full-file, lossless round-trip**  
  Parses the entire file into segments; only rewrites fields you change. Comments, functions, and unusual commands are preserved verbatim.

- **Project metadata editing**  
  - `cmake_minimum_required(VERSION …)`  
  - `project(<name> LANGUAGES CXX)`  
  - `set(CMAKE_CXX_STANDARD …)` (+ ensures `CMAKE_CXX_STANDARD_REQUIRED ON` when inserting)

- **Target dependencies**  
  Pick a target from a dropdown and edit its `target_link_libraries(...)` in a simple textarea. Existing libs are pre-populated.

- **Unsupported/Unparsed section (read-only)**  
  Shows the parts we don’t yet model. Comments and blanks are filtered out so this stays useful—not noisy.

- **Clean diff & apply flow**  
  Clicking **Apply** shows a single, in-memory diff tab (no temp files left behind). Confirm to write changes.

- **Explorer & editor context menu**  
  Quick access to the GUI from the file tree, the editor title, and the editor context menu.

---

## Getting started

1. Open a workspace with a `CMakeLists.txt`.
2. Right-click the file → **Open with CMake GUI (Visual)**  
   _or_ `Ctrl+Shift+P` → **CMake GUI: Open Visual Editor**.
3. Edit project fields or select a target and update its libraries.
4. Click **Apply** → review the diff → **Apply** to save.

---

## How it works

- The extension tokenizes the file into **commands** and **raw** spans while tracking byte offsets.
- It builds a small model (project meta, targets, `target_link_libraries`) and surfaces a list of targets.
- On **Apply**, only the relevant commands are replaced or inserted **in place**; all other text is left untouched.
- The diff is powered by an **in-memory content provider**, so no stray tabs or temp files remain after you apply/cancel.

---

## Supported edits (MVP)

- `cmake_minimum_required(VERSION …)`
- `project(<name> LANGUAGES CXX)`
- `set(CMAKE_CXX_STANDARD …)` (+ inserts `CMAKE_CXX_STANDARD_REQUIRED ON` when needed)
- `target_link_libraries(<target> …)` for a selected target  
  – Replaces existing block if present, otherwise inserts right after that target’s `add_executable`/`add_library`.

Everything else is preserved. Common commands like `target_include_directories`, `target_compile_definitions`, `install`, `option`, `add_subdirectory`, `find_package`, control flow, custom functions/macros, etc., are considered supported for preservation and won’t clutter the “Unsupported” panel.

---

## Commands

- **CMake GUI: Open Visual Editor**  
  `cmake-gui-editor.openVisual` – Opens the current/selected CMake file in the GUI.

_Context menus added:_
- Explorer → **Open with CMake GUI (Visual)**
- Editor title/context → **Open with CMake GUI (Visual)**

_Tip:_ Bind a key if you like: Keyboard Shortcuts → search for “CMake GUI: Open Visual Editor”.

---

## Requirements

- VS Code `^1.103.0`
- No required dependencies.  
  Optional: **CMake Tools** if you want configure/build/debug features; this extension focuses purely on editing CMake files.

---

## Extension settings

None yet. Sensible defaults are used.

---

## Known issues

- Target detection is conservative. Unusual target definitions (generated names, heavy macro indirection) may not appear in the target dropdown.
- Dependencies editing currently handles a single `target_link_libraries` block per target. Multiple scattered `tll` blocks are replaced by a single normalized block.
- Formatting of the rewritten commands is normalized (indents inside `tll` are consistent) and may not match your previous whitespace exactly—only for the commands you’ve changed.
- Very exotic bracket-arguments or deeply nested custom macro structures might confuse the simple balanced-parentheses scanner. Please file examples.

---

## Troubleshooting

- **The GUI command doesn’t appear**: ensure the workspace contains a `CMakeLists.txt`. Reload the window if you just installed the extension.
- **Webview is blank**: open “Help → Toggle Developer Tools” and check that `media/index.html` and `media/app.js` were packaged. Ensure `"files"` in `package.json` includes `dist/**` and `media/**`.
- **No targets listed**: confirm your targets are defined with `add_executable` or `add_library` using standard syntax. If you use macros to wrap these, share a snippet in an issue.

---

## Release notes

### 0.1.0
- First public preview
- Visual editor for project meta and per-target dependencies
- Clean in-memory diff and apply flow
- Explorer/editor context menu entries

---

## Roadmap

- Edit include directories, compile definitions, and compile options
- Multi-target editing in one view
- Smarter parsing of macro-wrapped targets
- Optional formatting preservation heuristics for replaced blocks

---

## License

MIT