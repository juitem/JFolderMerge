# UI Control Functional Requirements

This document details the functional specification for all interactive buttons and controls in the Folder Comparison Tool.

## 1. Main Navigation & Configuration

| Control | Icon / Label | Location | Action / Requirement |
| :--- | :--- | :--- | :--- |
| **Compare Button** | `Compare` / `Comparing...` | Main Toolbar | **Click**: Initiates folder comparison.<br>**State**: Disabled while processing.<br>**Validation**: Alerts if paths are empty. |
| **Browse Button (Left)** | `📂` | Left Input Group | **Click**: Opens "Select Folder" modal for Left Path.<br>**Effect**: Updates `#left-path` input upon selection. |
| **Browse Button (Right)** | `📂` | Right Input Group | **Click**: Opens "Select Folder" modal for Right Path.<br>**Effect**: Updates `#right-path` input upon selection. |
| **Theme Toggle** | `🌙` / `☀️` | Header (Top Right) | **Click**: Toggles between Dark and Light mode. |

## 2. Folder View Filters (Top Bar)

| Control | ID / Label | Default | Action / Requirement |
| :--- | :--- | :--- | :--- |
| **Show Added** | `#folder-show-added` | Checked | **Toggle On**: Displays items that exist *only* in the Right folder.<br>**Toggle Off**: Hides all 'Added' items in the folder tree. |
| **Show Removed** | `#folder-show-removed` | Checked | **Toggle On**: Displays items that exist *only* in the Left folder.<br>**Toggle Off**: Hides all 'Removed' items. |
| **Show Modified** | `#folder-show-modified` | Checked | **Toggle On**: Displays items existing in *both* but with different content.<br>**Toggle Off**: Hides all 'Modified' items. |
| **Show Same** | `#folder-show-same` | Checked | **Toggle On**: Displays identical items.<br>**Toggle Off**: Hides all 'Same' items. |

## 3. Diff Panel Controls

### 3.1. Window Controls (Top Left)

| Control | Icon | Action / Requirement |
| :--- | :--- | :--- |
| **Expand / Compress** | `⤢` (Expand)<br>`⤡` (Compress) | **Click (Normal)**: Expands Diff Panel to 100% width, hides Folder Tree.<br>**Click (Expanded)**: Restores Diff Panel to split width, shows Folder Tree.<br>**Hot Key**: `ESC` key must exit Expanded mode. |
| **Close** | `×` | **Click**: Hides the Diff Panel entirely.<br>**Requirement**: If clicked while Expanded, must implicitly exit Expanded mode to ensure Folder Tree is visible next time. |

### 3.2. View Mode Toggles (Top Right)

| Control | Icon | Action / Requirement |
| :--- | :--- | :--- |
| **Unified View** | `☰` | **Click**: Switches diff display to standard Unified Patch format.<br>**State**: Active button highlighted. |
| **Side-by-Side** | `║` | **Click**: Switches diff display to Split Pane view (Left/Right panes).<br>**State**: Active button highlighted. |
| **Both Views** | `☰║` | **Click**: Shows *both* Unified and Side-by-Side views via scrolling or stacking.<br>**State**: Active button highlighted. |

### 3.3. Diff View Filters (Inner Toolbar)

| Control | ID / Label | Default | Action / Requirement |
| :--- | :--- | :--- | :--- |
| **Show Added** | `#diff-show-added` | Checked | **Toggle Off**: Hides green addition lines in diff view. |
| **Show Removed** | `#diff-show-removed` | Checked | **Toggle Off**: Hides red removal lines in diff view. |
| **Show Modified** | `#diff-show-modified` | Checked | **Toggle Off**: Hides modified lines (yellow). |
| **Show Context** | `#diff-show-same` | Checked | **Toggle Off**: Hides context lines (white/grey) surrounding changes. |

## 4. Merge Actions (Inside Diff)

| Control | Icon / Label | Context | Action / Requirement |
| :--- | :--- | :--- | :--- |
| **Merge Right** | `→` | Left Pane / Left Side | **Click**: Copies content from Left line to Right file.<br>**Effect**: Updates backend file, auto-saves, validates write, and refreshes view. |
| **Merge Left** | `←` | Right Pane / Right Side | **Click**: Copies content from Right line to Left file.<br>**Effect**: Updates backend file, auto-saves, validates write, and refreshes view. |

## 5. Modal Controls

| Control | Label | Action / Requirement |
| :--- | :--- | :--- |
| **Nav Up** | `↑` | **Click**: Navigates to parent directory in browser. |
| **Select Folder** | `Select Folder` | **Click**: Confirms selection, closes modal, and populates the target input field. |
| **Close Modal** | (Area outside or X) | **Click**: Closes modal without changing input path. |
