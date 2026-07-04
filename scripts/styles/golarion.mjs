const colors = {
  waterDeep: "rgb(110, 160, 245)",
  regionBorders: "rgb(107, 42, 33)",
  regionLabels: "rgb(17, 42, 97)",
  regionLabelsOut: "rgb(213, 195, 138)",
  nationBorders: "rgb(170, 170, 170)",
  white: "rgb(255, 255, 255)",
  black: "rgb(10, 10, 10)"
};

const featureZoomMin = ["any", ["!", ["has", "minzoom"]], [">=", ["zoom"], ["get", "minzoom"]]];
const featureZoomMax = ["any", ["!", ["has", "maxzoom"]], ["<=", ["zoom"], ["get", "maxzoom"]]];
const timeIndexStart = ["any", ["!", ["has", "timeIndexStart"]], [">=", ["global-state", "timeIndex"], ["get", "timeIndexStart"]]];
const timeIndexEnd = ["any", ["!", ["has", "timeIndexEnd"]], ["<", ["global-state", "timeIndex"], ["get", "timeIndexEnd"]]];
const baseFilters = [featureZoomMin, featureZoomMax, timeIndexStart, timeIndexEnd];

function layer(id, sourceLayer, type, spec) {
  const merged = {
    id,
    type,
    source: "golarion",
    "source-layer": sourceLayer,
    ...spec
  };
  merged.filter = merged.filter ? ["all", merged.filter, ...baseFilters] : ["all", ...baseFilters];
  return merged;
}

export function buildStyle({ tilesUrl, glyphs, sprite }) {
  return {
    version: 8,
    projection: { type: "globe" },
    glyphs,
    sprite,
    sources: {
      golarion: {
        type: "vector",
        attribution:
          '<a href="https://paizo.com/licenses/communityuse">Paizo CUP</a>, ' +
          '<a href="https://github.com/pf-wikis/mapping#acknowledgments">pf-wikis</a>',
        url: `pmtiles://${tilesUrl}`,
        encoding: "mlt"
      }
    },
    state: {
      timeIndex: { default: 0 },
      rotated: { default: false }
    },
    transition: { duration: 300, delay: 0 },
    sky: { "atmosphere-blend": 0.5 },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": colors.waterDeep }
      },
      layer("fill_geometry", "geometry", "fill", {
        paint: { "fill-color": ["get", "color"], "fill-antialias": false }
      }),
      layer("borders-nations", "borders", "line", {
        filter: ["==", ["get", "borderType"], 3],
        paint: {
          "line-color": colors.nationBorders,
          "line-width": ["interpolate", ["exponential", 2], ["zoom"], 3, 0.375, 5, 2]
        },
        layout: { "line-cap": "round" }
      }),
      layer("borders-subregions", "borders", "line", {
        filter: ["==", ["get", "borderType"], 2],
        paint: {
          "line-color": colors.nationBorders,
          "line-width": ["interpolate", ["exponential", 2], ["zoom"], 0, 0.375, 3, 2]
        },
        layout: { "line-cap": "round" }
      }),
      layer("borders-regions", "borders", "line", {
        maxzoom: 5,
        filter: ["==", ["get", "borderType"], 1],
        paint: {
          "line-color": colors.regionBorders,
          "line-width": 2,
          "line-opacity": ["interpolate", ["exponential", 2], ["zoom"], 3.5, 1, 4, 0]
        },
        layout: { "line-cap": "round" }
      }),
      layer("borders-provinces", "borders", "line", {
        minzoom: 4,
        filter: ["==", ["get", "borderType"], 4],
        paint: {
          "line-color": colors.nationBorders,
          "line-opacity": ["interpolate", ["exponential", 2], ["zoom"], 4, 0, 6, 1],
          "line-dasharray": [5, 10]
        },
        layout: { "line-cap": "round" }
      }),
      layer("borders-districts", "borders", "line", {
        minzoom: 8,
        filter: ["==", ["get", "borderType"], 5],
        paint: {
          "line-color": colors.nationBorders,
          "line-opacity": ["interpolate", ["exponential", 2], ["zoom"], 8, 0, 10, 1],
          "line-dasharray": [2, 4]
        },
        layout: { "line-cap": "round" }
      }),
      layer("line-labels", "line-labels", "symbol", {
        layout: {
          "symbol-placement": "line",
          "text-max-angle": 20,
          "text-field": ["get", "label"],
          "text-font": ["NotoSans-Medium"],
          "symbol-spacing": 300,
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 16]
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": ["get", "halo"],
          "text-halo-width": ["interpolate", ["linear"], ["zoom"], 5, 0.125, 10, 1]
        }
      }),
      layer("location-icons", "locations", "symbol", {
        layout: {
          "icon-image": ["get", "icon"],
          "icon-pitch-alignment": "map",
          "icon-overlap": "always",
          "icon-ignore-placement": true,
          "icon-size": ["interpolate", ["exponential", 2], ["zoom"],
            0, ["^", 2, ["-", -2, ["get", "pregroupMinzoom"]]],
            1, ["^", 2, ["-", -1, ["get", "pregroupMinzoom"]]],
            2, ["min", 1, ["^", 2, ["-", 0, ["get", "pregroupMinzoom"]]]],
            3, ["min", 1, ["^", 2, ["-", 1, ["get", "pregroupMinzoom"]]]],
            4, ["min", 1, ["^", 2, ["-", 2, ["get", "pregroupMinzoom"]]]],
            5, ["min", 1, ["^", 2, ["-", 3, ["get", "pregroupMinzoom"]]]],
            6, ["min", 1, ["^", 2, ["-", 4, ["get", "pregroupMinzoom"]]]],
            7, ["min", 1, ["^", 2, ["-", 5, ["get", "pregroupMinzoom"]]]],
            8, ["min", 1, ["^", 2, ["-", 6, ["get", "pregroupMinzoom"]]]],
            9, ["min", 1, ["^", 2, ["-", 7, ["get", "pregroupMinzoom"]]]],
            10, ["min", 1, ["^", 2, ["-", 8, ["get", "pregroupMinzoom"]]]]
          ]
        }
      }),
      layer("labels", "labels", "symbol", {
        layout: {
          "text-field": ["get", "label"],
          "text-rotate": ["case", ["global-state", "rotated"], 0, ["get", "angle"]],
          "text-rotation-alignment": ["case", ["global-state", "rotated"], "viewport", "map"],
          "text-font": ["NotoSans-Medium"],
          "text-size": 16,
          "text-overlap": "always"
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": ["get", "halo"],
          "text-halo-width": 1.5
        }
      }),
      layer("location-labels", "locations", "symbol", {
        filter: ["all", ["has", "label"], [">=", ["zoom"], ["+", ["get", "pregroupMinzoom"], 5]]],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["NotoSans-Medium"],
          "text-size": 14,
          "text-variable-anchor": ["left", "right"],
          "text-radial-offset": 0.5,
          "text-rotation-alignment": ["case", ["global-state", "rotated"], "viewport", "map"]
        },
        paint: {
          "text-color": colors.white,
          "text-halo-color": colors.black,
          "text-halo-width": 0.8
        }
      }),
      layer("province-labels", "province-labels", "symbol", {
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["NotoSans-Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 5, 7, 20],
          "text-rotation-alignment": ["case", ["global-state", "rotated"], "viewport", "map"],
          "text-variable-anchor": ["center", "top", "bottom"],
          "symbol-z-order": "source"
        },
        paint: {
          "text-color": colors.white,
          "text-halo-color": colors.regionLabels,
          "text-halo-width": ["interpolate", ["linear"], ["zoom"], 5, 0.375, 7, 1.5]
        }
      }),
      layer("nation-labels", "nation-labels", "symbol", {
        filter: ["any", ["!", ["get", "inSubregion"]], [">", ["zoom"], 4]],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["NotoSans-Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 5, 25],
          "text-rotation-alignment": ["case", ["global-state", "rotated"], "viewport", "map"],
          "text-variable-anchor": ["center", "top", "bottom"],
          "symbol-z-order": "source"
        },
        paint: {
          "text-color": colors.white,
          "text-halo-color": colors.regionLabels,
          "text-halo-width": ["interpolate", ["linear"], ["zoom"], 4, 0.75, 5, 1.875]
        }
      }),
      layer("subregion-labels", "subregion-labels", "symbol", {
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["NotoSans-Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 5, 25],
          "text-rotation-alignment": ["case", ["global-state", "rotated"], "viewport", "map"],
          "text-variable-anchor": ["center", "top", "bottom"],
          "symbol-z-order": "source"
        },
        paint: {
          "text-color": colors.white,
          "text-halo-color": colors.regionLabels,
          "text-halo-width": ["interpolate", ["linear"], ["zoom"], 4, 0.75, 5, 1.875]
        }
      }),
      layer("region-labels", "region-labels", "symbol", {
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["NotoSans-Medium"],
          "text-size": 20,
          "text-rotation-alignment": ["case", ["global-state", "rotated"], "viewport", "map"],
          "text-variable-anchor": ["center", "top", "bottom"],
          "symbol-z-order": "source"
        },
        paint: {
          "text-color": colors.regionLabels,
          "text-halo-color": colors.regionLabelsOut,
          "text-halo-width": 1.5
        }
      })
    ]
  };
}
