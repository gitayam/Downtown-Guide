
import { useRef, useState, useMemo, useEffect } from 'react'
import Map, { 
  Source, 
  Layer, 
  Popup, 
  NavigationControl, 
  type MapRef,
  type LayerProps
} from 'react-map-gl/maplibre'
import type { DateStop } from '../../lib/api'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'

interface DatePlanMapProps {
  stops: DateStop[]
  className?: string
}

const routeLayer: LayerProps = {
  id: 'route',
  type: 'line',
  source: 'route',
  layout: {
    'line-join': 'round',
    'line-cap': 'round'
  },
  paint: {
    'line-color': '#A65D57', // Brick
    'line-width': 3,
    'line-dasharray': [2, 2] // Dashed line
  }
}

const stopLayer: LayerProps = {
  id: 'stops',
  type: 'circle',
  source: 'stops',
  paint: {
    'circle-color': '#A65D57',
    'circle-radius': 14,
    'circle-stroke-width': 3,
    'circle-stroke-color': '#fff'
  }
}

const stopNumberLayer: LayerProps = {
  id: 'stop-numbers',
  type: 'symbol',
  source: 'stops',
  layout: {
    'text-field': '{order}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 14
  },
  paint: {
    'text-color': '#ffffff'
  }
}

export default function DatePlanMap({ stops, className = '' }: DatePlanMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [popupInfo, setPopupInfo] = useState<DateStop | null>(null)

  // Filter stops that have venue locations
  const validStops = useMemo(() => 
    stops.filter(s => s.venue?.latitude && s.venue?.longitude),
  [stops])

  const routeGeoJSON = useMemo(() => {
    if (validStops.length < 2) return null
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: validStops.map(s => [s.venue!.longitude, s.venue!.latitude])
      }
    }
  }, [validStops])

  const stopsGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: validStops.map(stop => ({
        type: 'Feature',
        properties: {
          order: stop.order,
          activity: stop.activity,
          venue_name: stop.venue!.name,
          stop_data: stop // Keep full data for popup
        },
        geometry: {
          type: 'Point',
          coordinates: [stop.venue!.longitude, stop.venue!.latitude]
        }
      }))
    }
  }, [validStops])

  // Fit bounds when stops change
  useEffect(() => {
    if (validStops.length === 0 || !mapRef.current) return

    const bounds = new maplibregl.LngLatBounds()
    validStops.forEach(stop => {
      bounds.extend([stop.venue!.longitude!, stop.venue!.latitude!])
    })

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000
    })
  }, [validStops])

  const onClick = (event: any) => {
    const feature = event.features?.[0]
    if (feature) {
      // property objects are serialized in MapLibre events usually, but let's check
      // For safety, let's find the stop from our original list
      const order = feature.properties.order
      const stop = validStops.find(s => s.order === order)
      if (stop) setPopupInfo(stop)
    }
  }

  if (validStops.length === 0) {
    return (
      <div className={`bg-sand/20 rounded-xl flex items-center justify-center text-stone ${className}`}>
        No map locations available for this plan.
      </div>
    )
  }

  return (
    <div className={`rounded-xl overflow-hidden shadow-sm border border-sand relative ${className}`}>
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: 35.0527,
          longitude: -78.8784,
          zoom: 13
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onClick={onClick}
        interactiveLayerIds={['stops', 'stop-numbers']}
      >
        <NavigationControl position="top-right" />

        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON as any}>
            <Layer {...routeLayer} />
          </Source>
        )}

        <Source id="stops" type="geojson" data={stopsGeoJSON as any}>
          <Layer {...stopLayer} />
          <Layer {...stopNumberLayer} />
        </Source>

        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.venue!.longitude!}
            latitude={popupInfo.venue!.latitude!}
            onClose={() => setPopupInfo(null)}
            className="min-w-[200px]"
          >
            <div className="p-1">
              <div className="text-xs font-bold text-brick uppercase mb-1">
                Step {popupInfo.order}: {popupInfo.activity}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">
                {popupInfo.venue!.name}
              </h3>
              <p className="text-xs text-stone mb-2">
                {popupInfo.notes}
              </p>
              <div className="text-xs text-gray-500">
                {popupInfo.venue!.address}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
