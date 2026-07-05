# Globe Forge

[English](README.md) | [Русский](README.ru.md)

A [Foundry VTT](https://foundryvtt.com/) v13 module: interactive globes of game worlds. A globe scene with vector tiles and free zoom from planet to region; globes are described by declarative manifests. The first built-in world is Golarion, based on data from the [pf-wikis/mapping](https://github.com/pf-wikis/mapping) project.

## Features

- Create a globe scene in one click with the **Create Globe** button in the scene directory.
- Explore the full map of Golarion from the whole planet down to a single city.
- Click a location to read what it is and jump to its PathfinderWiki article.
- The location card can open the journal pinned there or create a new one in one click.
- Drag a journal onto the globe to anchor it to a place. The place card opens it.
- Drop an actor onto the globe to place its token. Tokens keep their ground size at any zoom.
- Play offline by putting the map file into your Foundry data folder.
- Replace the space around the sphere with your own backdrop in the scene configuration.

## Installation

1. **Add-on Modules → Install Module**.
2. Paste into the **Manifest URL** field:
   ```
   https://github.com/def-gu/globe-forge/releases/latest/download/module.json
   ```
3. Install and enable the module in your world settings.

## Map data

By default the Golarion tiles are loaded from a network mirror. For offline use and faster loading, put the `golarion.pmtiles` file into the `Data/globe-forge/` folder of your Foundry user data directory — the module picks it up automatically. The file can be downloaded from the releases page or from [map.pathfinderwiki.com](https://map.pathfinderwiki.com/golarion.pmtiles).

## Development

Pure math (the coordinate bridge, source selection) is covered by tests:

```
node --test test/geo.test.mjs test/sources.test.mjs
```

## License and attribution

Code — [MIT](LICENSE).

Globe Forge uses trademarks and/or copyrights owned by Paizo Inc., used under [Paizo's Community Use Policy](https://paizo.com/licenses/communityuse). We are expressly prohibited from charging you to use or access this content. Globe Forge is not published, endorsed, or specifically approved by Paizo. Golarion map data comes from the [pf-wikis/mapping](https://github.com/pf-wikis/mapping) project and its contributors.
