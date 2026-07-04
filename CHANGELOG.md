# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- English and Russian interface localization; per-locale globe names in world manifests.

## [0.1.1] - 2026-07-04

### Fixed

- Black screen on regular scenes after visiting a globe: the shared PIXI ticker was never restarted.

## [0.1.0] - 2026-07-04

### Added

- Globe scenes rendered with MapLibre GL: globe projection, MLT vector tiles, free zoom from planet to region.
- **Create Globe** button in the scene directory with a "world + name" dialog.
- Golarion content pack on [pf-wikis/mapping](https://github.com/pf-wikis/mapping) data: borders by type, region and city labels, location icons.
- Prioritized data sources: a local file first, then a network mirror, with automatic failover.
- Ambient starfield backdrop with slow rotation; per-scene custom backdrop (any CSS background).
- Globe and backdrop fields in the scene configuration.

[Unreleased]: https://github.com/def-gu/globe-forge/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/def-gu/globe-forge/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/def-gu/globe-forge/releases/tag/v0.1.0
