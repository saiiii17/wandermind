import { useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''

export default function MapView({ destination, stops = [] }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!MAPS_KEY || !containerRef.current) return
    if (mapRef.current) return // already initialised

    // Load Google Maps JS SDK dynamically
    if (!window.google?.maps) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=__wandermindMapInit`
      script.async = true
      script.defer = true
      window.__wandermindMapInit = initMap
      document.head.appendChild(script)
    } else {
      initMap()
    }

    function initMap() {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: destination }, (results, status) => {
        if (status !== 'OK' || !results[0]) return
        const center = results[0].geometry.location
        const map = new window.google.maps.Map(containerRef.current, {
          center,
          zoom: 13,
          styles: darkMapStyle,
          disableDefaultUI: true,
          zoomControl: true,
        })
        mapRef.current = map

        // Add markers for each stop
        stops.forEach((stop, i) => {
          if (!stop.place_id && !stop.title) return
          const marker = new window.google.maps.Marker({
            map,
            title: stop.title,
            label: { text: `${i + 1}`, color: '#fff', fontWeight: 'bold' },
          })
          if (stop.lat && stop.lng) {
            marker.setPosition({ lat: stop.lat, lng: stop.lng })
          }
        })
      })
    }
  }, [destination, stops])

  if (!MAPS_KEY) {
    return (
      <div className="h-48 glass rounded-xl flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Map view</p>
          <p className="text-slate-600 text-xs mt-1">Add VITE_GOOGLE_MAPS_KEY to enable</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-48 rounded-xl overflow-hidden border border-border"
    />
  )
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0c0c18' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c0c18' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e1e3a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111124' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c2c5e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d2b' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]
