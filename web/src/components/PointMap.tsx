import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from 'react-leaflet'

import type { PointSummary } from '../api/points.ts'
import {
  DEFAULT_ICON,
  FATEC_ICON,
  MAX_BOUNDS,
  ORIGIN_ICON,
  OSM_ATTRIBUTION,
  OSM_TILES,
  SELECTED_ICON,
} from '../lib/leaflet.ts'
import { UNNAMED_POINT } from '../lib/materials.ts'
import { FATEC_ZONA_LESTE } from '../lib/region.ts'

// Same as Tailwind's "md" breakpoint, where the details panel moves to the right side.
const DESKTOP_QUERY = '(min-width: 768px)'
// Zoomed in on the initial center's neighbourhood; one level wider on narrow phone screens
// so the nearest points are still in view.
const INITIAL_ZOOM_DESKTOP = 12
const INITIAL_ZOOM_PHONE = 11
// Size of the details panel (see PointDetailsPanel: md:w-96 and max-h-[65%]).
const PANEL_WIDTH = 384
const BOTTOM_SHEET_SHARE = 0.65
// Size of the nearby search box (see NearbySearch: md:w-[23rem], and up to about 45% of the height on phones).
const SEARCH_WIDTH = 368
const SEARCH_SHARE_PHONE = 0.45

/** Stops zooming out past the level where the whole region fits on screen (it depends on the screen size). */
function LimitZoomToRegion() {
  const map = useMap()
  useEffect(() => {
    const updateMinZoom = () => map.setMinZoom(map.getBoundsZoom(MAX_BOUNDS))
    updateMinZoom()
    map.on('resize', updateMinZoom)
    return () => {
      map.off('resize', updateMinZoom)
    }
  }, [map])
  return null
}

function KeepSelectedVisible({ point }: { point: PointSummary | null }) {
  const map = useMap()
  useEffect(() => {
    if (!point) {
      return
    }
    // Leave room for the search box and the details panel so they do not cover the selected marker.
    // On phones only the search field stays at the top while a point is selected.
    const desktop = window.matchMedia(DESKTOP_QUERY).matches
    const paddingTopLeft: L.PointTuple = desktop ? [SEARCH_WIDTH + 24, 24] : [24, 96]
    const paddingBottomRight: L.PointTuple = desktop
      ? [PANEL_WIDTH + 24, 24]
      : [24, Math.round(map.getSize().y * BOTTOM_SHEET_SHARE) + 24]
    map.panInside([point.latitude, point.longitude], { paddingTopLeft, paddingBottomRight })
  }, [map, point])
  return null
}

/** Where a nearby search started and the points to keep in view, nearest first. */
export interface MapFocus {
  origin: { latitude: number; longitude: number }
  points: PointSummary[]
}

/** Shows the search origin and its nearest points, leaving room for the search box and the details panel. */
function FitToFocus({ focus }: { focus: MapFocus | null }) {
  const map = useMap()
  useEffect(() => {
    if (!focus) {
      return
    }
    const bounds = L.latLngBounds([[focus.origin.latitude, focus.origin.longitude]])
    focus.points.slice(0, 3).forEach((point) => bounds.extend([point.latitude, point.longitude]))
    const desktop = window.matchMedia(DESKTOP_QUERY).matches
    map.fitBounds(bounds, {
      paddingTopLeft: desktop ? [SEARCH_WIDTH + 40, 40] : [24, Math.round(map.getSize().y * SEARCH_SHARE_PHONE) + 24],
      paddingBottomRight: [40, 40],
      maxZoom: 15,
    })
  }, [map, focus])
  return null
}

interface PointMapProps {
  points: PointSummary[]
  selected: PointSummary | null
  onSelect: (point: PointSummary) => void
  focus: MapFocus | null
}

export default function PointMap({ points, selected, onSelect, focus }: PointMapProps) {
  const initialZoom = window.matchMedia(DESKTOP_QUERY).matches ? INITIAL_ZOOM_DESKTOP : INITIAL_ZOOM_PHONE
  return (
    <MapContainer
      center={[FATEC_ZONA_LESTE.latitude, FATEC_ZONA_LESTE.longitude]}
      zoom={initialZoom}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1}
      zoomControl={false}
      className="absolute inset-0 z-0"
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILES} />
      {/* Bottom left: the top is taken by the search box. */}
      <ZoomControl position="bottomleft" zoomInTitle="Aproximar" zoomOutTitle="Afastar" />
      {/* Reference marker, not a collection point: it does not open the details panel. */}
      <Marker
        position={[FATEC_ZONA_LESTE.latitude, FATEC_ZONA_LESTE.longitude]}
        icon={FATEC_ICON}
        interactive={false}
        keyboard={false}
        zIndexOffset={500}
      />
      {points.map((point) => {
        const name = point.name ?? UNNAMED_POINT
        return (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={point.id === selected?.id ? SELECTED_ICON : DEFAULT_ICON}
            zIndexOffset={point.id === selected?.id ? 1000 : 0}
            title={name}
            alt={name}
            keyboard
            eventHandlers={{
              click: () => onSelect(point),
              // Leaflet makes markers focusable buttons but only opens popups on Enter, so handle it here.
              keydown: (event: L.LeafletKeyboardEvent) => {
                const key = event.originalEvent.key
                if (key === 'Enter' || key === ' ') {
                  event.originalEvent.preventDefault()
                  onSelect(point)
                }
              },
            }}
          />
        )
      })}
      {focus && (
        // Reference only, like the Fatec marker; the search box says in words where the search started.
        <Marker
          position={[focus.origin.latitude, focus.origin.longitude]}
          icon={ORIGIN_ICON}
          interactive={false}
          keyboard={false}
          zIndexOffset={400}
        />
      )}
      <LimitZoomToRegion />
      <FitToFocus focus={focus} />
      <KeepSelectedVisible point={selected} />
    </MapContainer>
  )
}
