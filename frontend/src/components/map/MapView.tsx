"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix default marker icons with Leaflet + bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#22c55e;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const yellowIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#eab308;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const redIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function getScoreIcon(score: number) {
  if (score >= 70) return greenIcon;
  if (score >= 40) return yellowIcon;
  return redIcon;
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

interface LeadMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  opportunity_score: number;
  phone: string | null;
  email: string | null;
  domain: string | null;
  address: string | null;
  industry: string | null;
  status: string;
}

interface MapViewProps {
  center: [number, number];
  radiusKm: number;
  leads: LeadMarker[];
  onMarkerClick?: (lead: LeadMarker) => void;
}

function MapBounds({ leads }: { leads: LeadMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (leads.length > 0) {
      const bounds = L.latLngBounds(leads.map((l) => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [leads, map]);
  return null;
}

export default function MapView({ center, radiusKm, leads, onMarkerClick }: MapViewProps) {
  return (
    <div className="h-[500px] w-full rounded-lg border overflow-hidden z-0">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 2, dashArray: "8 4" }}
        />
        {leads.map((lead) => (
          <Marker
            key={lead.id}
            position={[lead.latitude, lead.longitude]}
            icon={getScoreIcon(lead.opportunity_score)}
            eventHandlers={{ click: () => onMarkerClick?.(lead) }}
          >
            <Popup>
              <div className="min-w-[200px] space-y-1">
                <p className="font-semibold text-sm">{lead.name}</p>
                {lead.industry && <p className="text-xs text-gray-600">{lead.industry}</p>}
                {lead.address && <p className="text-xs text-gray-500">{lead.address}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold ${getScoreColor(lead.opportunity_score)}`}>
                    Score: {lead.opportunity_score}
                  </span>
                </div>
                {lead.phone && <p className="text-xs">📞 {lead.phone}</p>}
                {lead.email && <p className="text-xs">✉️ {lead.email}</p>}
                {lead.domain && (
                  <a
                    href={`https://${lead.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    🌐 {lead.domain}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {leads.length > 0 && <MapBounds leads={leads} />}
      </MapContainer>
    </div>
  );
}
