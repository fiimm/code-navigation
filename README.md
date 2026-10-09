# Code Navigation

Hierarchical code navigation for large codebases. Build a semantic map of your project from comment tags and navigate through a tree panel.

## Why

In embedded C/C++ projects, logical blocks often span many files: init routines, state machines, protocol handlers. Code structure (functions, classes) doesn't reflect these logical relationships. Comment tags do.

Place a few tags, open the panel — get a tree that mirrors how you actually think about the project.

## Quick Start

### 1. Enable a file

Add the marker to the first 3 lines of the file:

```c
/*NAV_ENABLED*/
#include <stdio.h>
```

Only files with this marker are scanned.

### 2. Add navigation tags

Use the format `//NAV_TAG_NAME` (the prefix and marker are configurable):

```c
/*NAV_ENABLED*/

//NAV_INIT
void system_init(void) {
    //NAV_INIT_UART
    uart_init();

    //NAV_INIT_BLE
    ble_init();

    //NAV_INIT_BLE_CONFIG
    ble_set_config();
}

//NAV_MAIN_LOOP
int main(void) {
    system_init();

    //NAV_MAIN_LOOP_PROCESS
    while (1) {
        process();
    }
}
```

### 3. Open the panel

Click the **Code Navigation** icon in the Activity Bar. You'll see:

```
📁 INIT
  🔵 UART
  📁 BLE
    🔵 CONFIG
📁 MAIN_LOOP
  🔵 PROCESS
```

Click any node to jump to its line. If a tag appears in several places, a counter like `(2)` appears — click it to pick which occurrence to open.

## Tag Naming

Tags use underscores for hierarchy:

| Tag | Meaning |
|---|---|
| `NAV_INIT` | root `INIT` |
| `NAV_INIT_UART` | `UART` under `INIT` |
| `NAV_INIT_BLE_CONFIG` | `CONFIG` under `BLE` under `INIT` |

Intermediate levels can be skipped. `NAV_INIT_BLE_CONFIG` without `NAV_INIT_BLE` creates a **virtual** parent `BLE` (shown with ⚠️).

## Slash Expansion

Write a tag with a slash to get **two views of the same code location**. This is useful when your data has two natural axes — for example, screens × properties, and you want to navigate either by screen or by property.

### Basic rule

`A/B_1_2_3` expands to two tags:

- `A_1_2_3` — left branch, tail as-is
- `B_2_1_3` — right branch, first two tail elements swapped

### Examples

| Written | Expands to |
|---|---|
| `NAV_A/B_1_2_3` | `NAV_A_1_2_3`, `NAV_B_2_1_3` |
| `NAV_A_1/2_3_4_5` | `NAV_A_1_3_4_5`, `NAV_A_2_4_3_5` |
| `NAV_A/B_1/2_3_4` | `NAV_A_1_3_4`, `NAV_B_3_1_4`, `NAV_A_2_4_3`, `NAV_B_4_2_3` |
| `NAV_A/B_1` | `NAV_A/B_1` (tail too short, no expansion) |
| `NAV_A/B` | `NAV_A/B` (tail too short, no expansion) |

### How it works

Processing starts from the **last** slash and recurses. Each slash produces two tags: one keeps the tail, the other swaps the first two tail elements. Multiple slashes multiply: 2 slashes → 4 tags, 3 → 8, and so on.

**Limit:** if a single tag would expand to more than **16** entries, the extension logs a warning and keeps the tag as-is (to avoid runaway expansion).

### Real-world example

You have two screens, each with a brightness and a color property. You want to browse **by screen** (all its properties) and **by property** (all screens that have it). One tag gives you both trees:

```c
//NAV_SCREEN1/SCREEN2_BRIGHTNESS_COLOR
```

Expands to:

- `SCREEN1_BRIGHTNESS_COLOR`
- `SCREEN2_COLOR_BRIGHTNESS`

Result tree:

```
📁 SCREEN1
  📁 BRIGHTNESS
    🔵 COLOR
📁 SCREEN2
  📁 COLOR
    🔵 BRIGHTNESS
```

Both leaves point to the same line in the file.

## Icons

| Icon | Meaning |
|---|---|
| 📁 | real parent node (a tag with this name exists) |
| ⚠️ | virtual parent (created automatically, tag missing) |
| 🔵 | normal leaf |
| 🔴 | node exceeds `maxDepth` |
| `(N)` | tag appears N times in the project |

## Settings

| Setting | Default | Description |
|---|---|---|
| `codeNav.prefix` | `NAV_` | Tag prefix (without comment symbols) |
| `codeNav.maxDepth` | `3` | Maximum tree depth |
| `codeNav.enabledMarker` | `{PREFIX}ENABLED` | Marker that enables a file for scanning. `{PREFIX}` is replaced by `prefix` |
| `codeNav.scanFirstLines` | `3` | How many first lines to check for the marker |

## Multi-file Example

**main.c**
```c
/*NAV_ENABLED*/
//NAV_SYSTEM_INIT
void init(void) { }

//NAV_SYSTEM_LOOP
int main(void) { }
```

**ble.c**
```c
/*NAV_ENABLED*/
//NAV_SYSTEM_BLE_INIT
void ble_init(void) { }

//NAV_SYSTEM_BLE_SEND
void ble_send(void) { }
```

Result:

```
📁 SYSTEM
  🔵 INIT
  🔵 LOOP
  📁 BLE
    🔵 INIT
    🔵 SEND
```

## Language Support

Works with any language that has line comments. The extension recognizes `//`, `#`, `/*`, `*`, and `'` as comment starts:

- C / C++ — `//NAV_TAG` or `/*NAV_TAG*/`
- Python — `#NAV_TAG`
- Shell / Bash — `#NAV_TAG`
- Lua — `--NAV_TAG`
- Rust — `//NAV_TAG`

## Installation

### From VSIX

1. Open VS Code
2. Extensions (`Ctrl+Shift+X`) → `...` menu → **Install from VSIX...**
3. Select the `.vsix` file

Or from the command line:

```
code --install-extension code-navigation-0.1.9.vsix
```

### From source

```bash
git clone https://github.com/ваш_логин/code-navigation.git
cd code-navigation
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

## License

MIT
