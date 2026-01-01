# Mapping System Documentation

This document outlines the geospatial visualization components of the Downtown Fayetteville Event Guide. We currently maintain two parallel mapping implementations to ensure stability while testing modern vector capabilities.

## 1. Production Map (Leaflet)

Our primary map view uses **React-Leaflet**, a wrapper around the industry-standard Leaflet.js library.

*   **Technology**: `react-leaflet`, `leaflet`, `react-leaflet-cluster`
*   **Tile Source**: OpenStreetMap (Raster Tiles)
*   **Key Features**:
    *   **Clustering**: Automatically groups nearby events to prevent clutter.
    *   **Custom Markers**: SVG-based icons (Brick Red for standard, Gold for featured events).
    *   **Popups**: Interactive info windows with event details and links.
    *   **Auto-Zoom**: Automatically fits bounds to show all visible events on load.

### Configuration
The map is configured in `web/src/components/MapView.tsx`.
```typescript
<TileLayer
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>
```

## 2. Beta Map (MapLibre GL JS)

We have introduced a modern, vector-based map using **MapLibre GL JS**, accessible via the "Globe" icon in the view toggle.

*   **Technology**: `react-map-gl`, `maplibre-gl`
*   **Tile Source**: OpenFreeMap (Vector Tiles)
*   **Why Vector?**: Vector tiles allow for smooth zooming, rotation, sharper text, and significantly better performance with large datasets (WebGL-powered).

### Solving the "All Green" Issue
Initially, the beta map used a generic demo style (`demotiles.maplibre.org`) which lacked proper data for our region, resulting in a blank green map.

**The Solution:** We switched to **OpenFreeMap**, a free, open-source project that creates production-grade vector tiles from OpenStreetMap data.
*   **Style URL**: `https://tiles.openfreemap.org/styles/liberty`
*   **Benefit**: No API keys required, free for usage, high-quality cartography.

### Configuration
The map is configured in `web/src/components/MapLibreView.tsx`.

```typescript
<Map
  mapStyle="https://tiles.openfreemap.org/styles/liberty"
  // ...
>
```

**Clustering Implementation:**
Unlike Leaflet (which uses a plugin), MapLibre has native, GPU-accelerated clustering for GeoJSON sources. We configure this in the `<Source>` component:

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

## 3. Deployment & Usage

*   **Default View**: The application defaults to the "List" or "Leaflet Map" view for stability.
*   **Beta Access**: Users can switch to the MapLibre view using the view toggle component (`GlobeAmericasIcon`).
*   **Future Roadmap**: Once the MapLibre view is fully battle-tested (mobile responsiveness, touch interactions), it is intended to replace the Leaflet implementation entirely for a more modern user experience.

## 4. Troubleshooting

*   **Missing Markers**: Ensure the event data includes valid `venue_latitude` and `venue_longitude`.
*   **Blank Map**: Check if the `mapStyle` URL is accessible and not blocked by CSP (Content Security Policy).
*   **Performance**: If the map becomes sluggish with thousands of points, consider adjusting `clusterRadius` or filtering data before passing it to the map.
