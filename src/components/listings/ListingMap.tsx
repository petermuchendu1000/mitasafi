/**
 * Listing Map Component
 * 
 * Interactive map using Mapbox GL JS.
 * Respects hide_exact_address setting for privacy.
 * 
 * Features:
 * - Interactive map with zoom/pan
 * - Exact pin or approximate circle based on privacy
 * - Nearby landmarks display
 * - Link to Google Maps directions
 */

"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { 
  MapPin, 
  Navigation, 
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

// Set Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface ListingMapProps {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  area: string;
  city: string;
  landmarks: string | null;
  buildingName: string | null;
  hideExactAddress: boolean;
  className?: string;
}

// Generate Google Maps directions URL
function getDirectionsUrl(lat: number, lng: number, name: string): string {
  const destination = encodeURIComponent(`${name} @${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function ListingMap({
  latitude,
  longitude,
  address,
  area,
  city,
  landmarks,
  buildingName,
  hideExactAddress,
  className,
}: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  
  const hasCoordinates = latitude !== null && longitude !== null;

  // Parse landmarks string into array
  const landmarksList = landmarks 
    ? landmarks.split(",").map(l => l.trim()).filter(Boolean)
    : [];

  // Initialize map
  useEffect(() => {
    if (!hasCoordinates || !mapContainer.current || map.current) return;
    if (!mapboxgl.accessToken) {
      setMapError(true);
      return;
    }

    try {
      const zoom = hideExactAddress ? 13 : 15;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [longitude!, latitude!],
        zoom: zoom,
        attributionControl: false,
        interactive: true,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right"
      );

      map.current.on("load", () => {
        setMapLoaded(true);

        if (!map.current) return;

        if (hideExactAddress) {
          // Add approximate area circle
          map.current.addSource("approximate-area", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [longitude!, latitude!],
              },
            },
          });

          // Outer circle (fill)
          map.current.addLayer({
            id: "approximate-circle-fill",
            type: "circle",
            source: "approximate-area",
            paint: {
              "circle-radius": 80,
              "circle-color": "#0d9488",
              "circle-opacity": 0.1,
            },
          });

          // Inner circle (stroke)
          map.current.addLayer({
            id: "approximate-circle-stroke",
            type: "circle",
            source: "approximate-area",
            paint: {
              "circle-radius": 80,
              "circle-color": "transparent",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#0d9488",
              "circle-stroke-opacity": 0.4,
            },
          });

          // Center dot
          map.current.addLayer({
            id: "approximate-center",
            type: "circle",
            source: "approximate-area",
            paint: {
              "circle-radius": 6,
              "circle-color": "#0d9488",
            },
          });
        } else {
          // Add exact location marker
          const el = document.createElement("div");
          el.className = "mapbox-marker";
          el.innerHTML = `
            <div style="
              width: 32px;
              height: 32px;
              background: #0d9488;
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
              <div style="
                width: 8px;
                height: 8px;
                background: white;
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              "></div>
            </div>
          `;

          new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([longitude!, latitude!])
            .addTo(map.current);
        }
      });

      map.current.on("error", () => {
        setMapError(true);
      });
    } catch {
      setMapError(true);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [hasCoordinates, latitude, longitude, hideExactAddress]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Map Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          Location
        </h3>
        {hideExactAddress && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            Approximate
          </span>
        )}
      </div>

      {/* Location Details */}
      <div className="text-sm text-gray-600">
        {buildingName && (
          <span className="font-medium text-gray-900">{buildingName} • </span>
        )}
        {!hideExactAddress && address && (
          <span>{address}, </span>
        )}
        <span>{area}, {city}</span>
      </div>

      {/* Map */}
      {hasCoordinates && !mapError ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <div 
            ref={mapContainer} 
            className="h-48 lg:h-56 bg-gray-100"
          />
          
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Get Directions Button */}
          <a
            href={getDirectionsUrl(latitude, longitude, buildingName || area)}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 left-2 bg-white shadow-sm rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors border border-gray-200"
          >
            <Navigation className="w-3.5 h-3.5" />
            Directions
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        </div>
      ) : (
        <div className="h-48 lg:h-56 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
          <div className="text-center text-gray-400">
            <MapPin className="w-6 h-6 mx-auto mb-1" />
            <p className="text-xs">Map not available</p>
          </div>
        </div>
      )}

      {/* Nearby Landmarks */}
      {landmarksList.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Nearby</p>
          <div className="flex flex-wrap gap-1.5">
            {landmarksList.map((landmark, index) => (
              <span
                key={index}
                className="text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100 text-gray-600"
              >
                {landmark}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Note */}
      {hideExactAddress && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          Exact address shared after inquiry
        </p>
      )}
    </div>
  );
}

export default ListingMap;
