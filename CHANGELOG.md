# Change Log

All notable changes to the "vscode-dev-plan" extension will be documented in this file.

Check [Keep a Changelog](https://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Translation
- Hotkeys
- Copy/Paste
- Export in MSExcel
- Plan list panel

## [0.1.0] - 2021-09-14

### Added

- Basic Framework for create and edit Development Plan.

## [0.2.0] - 2021-09-17

### Added

- Time input/output format. Value **2:30** and **2.5** is equal.
- Add setting: **TimeFormat**. Switching between time format and number.
- Transition to added element.
- Switching to the added line.
- Hiding descriptions when they are empty.
- Multi-level list of stages of refinement.
- Marks and time editing is now available only for stages without descendants..
- Header Parsing: "# 999 Something there" worst broken on the number of the Ticket and Title.

### Removed

- Inserting steps in the middle of the list.

## [0.3.0] - 2021-09-28

### Added

- Indents and formatting of nested steps
- Advanced text editing capabilities
- Improved transitions between cells and automatic text selection
- Improved editor communication with the stored file. Now when saving while editing text, it will not be lost
- Added the ability to use templates
- Add setting **PlanTemplate**. Contains a list of templates to select

### Fixed

- The problem of opening a file when creating a new plan with the path containing not ASCII characters

### Changed

- Changed the file creation scheme. The plan is not written on the disk when creating.
