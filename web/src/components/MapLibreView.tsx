import { useRef, useState, useMemo } from 'react'
import Map, { 
  Source, 
  Layer, 
  Popup, 
  NavigationControl, 
  GeolocateControl,
  type MapRef,
  type LayerProps
} from 'react-map-gl/maplibre'
import type { Event } from '../lib/types'
import { Link } from 'react-router-dom'
import { formatEventDateFull, formatEventTimeRange } from '../lib/utils'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapLibreViewProps {
  events: Event[]
}

// Clustering configuration
const clusterLayer: LayerProps = {
  id: 'clusters',
  type: 'circle',
  source: 'events',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#A65D57', // Brick (Low count)
      10,
      '#F59E0B', // Amber (Medium count)
      30,
      '#2D6A4F'  // Forest (High count)
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20,
      10,
      30,
      30,
      40
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff'
  }
}

const clusterCountLayer: LayerProps = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'events',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  },
  paint: {
    'text-color': '#ffffff'
  }
}

const unclusteredPointLayer: LayerProps = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'events',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': [
      'case',
      ['get', 'featured'],
      '#F59E0B', // Gold for featured
      '#A65D57'  // Brick for standard
    ],
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff'
  }
}

export default function MapLibreView({ events }: MapLibreViewProps) {
  const mapRef = useRef<MapRef>(null)
  const [popupInfo, setPopupInfo] = useState<Event | null>(null)

  // Convert events to GeoJSON
  const eventsGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: events
        .filter(e => (e.venue_latitude && e.venue_longitude) || (e.venue_coordinates?.lat && e.venue_coordinates?.lng))
        .map(event => ({
          type: 'Feature',
          properties: {
            id: event.id,
            title: event.title,
            description: event.description,
            start_datetime: event.start_datetime,
            end_datetime: event.end_datetime,
            venue_name: event.venue_name || event.location_name,
            featured: event.featured ? true : false,
            // We need to pass the whole event object for the popup logic to be simple, 
            // or just the ID and find it. Storing minimal props in GeoJSON is better for perf.
          },
          geometry: {
            type: 'Point',
            coordinates: [
              event.venue_longitude || event.venue_coordinates!.lng, 
              event.venue_latitude || event.venue_coordinates!.lat
            ]
          }
        }))
    }
  }, [events])

  const onClick = (event: any) => {
    if (!event.features || event.features.length === 0) return
    const feature = event.features[0]
    
    // If it's a cluster, zoom in
    const clusterId = feature.properties.cluster_id
    if (clusterId) {
      const map = mapRef.current?.getMap()
      // @ts-ignore - getClusterExpansionZoom exists on the source
      map?.getSource('events').getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return
        map.easeTo({
          center: feature.geometry.coordinates,
          zoom,
          duration: 500
        })
      })
      return
    }

    // If it's a point, find the event and show popup
    // Since we filtered events earlier, we find the matching event
    const eventData = events.find(e => e.id === feature.properties.id)
    if (eventData) {
      setPopupInfo(eventData)
    }
  }

  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-sm border border-sand z-0 relative">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: 35.0527,
          longitude: -78.8784,
          zoom: 13
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://demotiles.maplibre.org/style.json"
        onClick={onClick}
        interactiveLayerIds={['clusters', 'unclustered-point']}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        <Source
          id="events"
          type="geojson"
          data={eventsGeoJSON as any}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>

        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.venue_longitude || popupInfo.venue_coordinates!.lng}
            latitude={popupInfo.venue_latitude || popupInfo.venue_coordinates!.lat}
            onClose={() => setPopupInfo(null)}
            className="min-w-[250px]"
          >
            <div className="p-1">
              <h3 className="font-bold text-gray-900 mb-2 border-b pb-1">
                {popupInfo.venue_name || popupInfo.location_name}
              </h3>
              <Link 
                to={`/events/${popupInfo.id}`} 
                className="block group hover:bg-gray-50 p-1 rounded transition-colors"
              >
                <div className="text-sm font-semibold text-brick group-hover:underline">
                  {popupInfo.title}
                </div>
                <div className="text-xs text-gray-500">
                  {formatEventDateFull(popupInfo.start_datetime)}
                </div>
                <div className="text-xs text-gray-400">
                  {formatEventTimeRange(popupInfo.start_datetime, popupInfo.end_datetime)}
                </div>
              </Link>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
