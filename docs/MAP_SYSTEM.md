# Mapping System Documentation

This document outlines the geospatial visualization components of the Downtown Fayetteville Event Guide.

## Modern Vector Map (MapLibre GL JS)

We use a modern, vector-based map using **MapLibre GL JS** and **react-map-gl**.

*   **Technology**: `react-map-gl`, `maplibre-gl`
*   **Tile Source**: OpenFreeMap (Vector Tiles)
*   **Why Vector?**: Vector tiles allow for smooth zooming, rotation, sharper text, and significantly better performance with large datasets (WebGL-powered).

### Tile Source
We use **OpenFreeMap**, a free, open-source project that creates production-grade vector tiles from OpenStreetMap data.
*   **Style URL**: `https://tiles.openfreemap.org/styles/liberty`
*   **Benefit**: No API keys required, free for usage, high-quality cartography.

### Configuration
The map is configured in `web/src/components/MapView.tsx`.

```typescript
<Map
  mapStyle="https://tiles.openfreemap.org/styles/liberty"
  // ...
>
```

**Clustering Implementation:**
MapLibre has native, GPU-accelerated clustering for GeoJSON sources. We configure this in the `<Source>` component:

```typescript
<Source
  id="events"
  type="geojson"
  data={eventsGeoJSON}
  cluster={true}
  clusterMaxZoom={14}
  clusterRadius={50}
>
  {/* Layers for clusters, counts, and unclustered points */}
</Source>
```

## Troubleshooting

*   **Missing Markers**: Ensure the event data includes valid `venue_latitude` and `venue_longitude`.
*   **Blank Map**: Check if the `mapStyle` URL is accessible and not blocked by CSP (Content Security Policy).
*   **Performance**: If the map becomes sluggish with thousands of points, consider adjusting `clusterRadius` or filtering data before passing it to the map.