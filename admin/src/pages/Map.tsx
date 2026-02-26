import { useCallback, useEffect, useRef, useState } from "react";
import Map from "react-map-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { IconLayer } from "@deck.gl/layers";
import type { MapRef } from "react-map-gl";
import { Loader2 } from "lucide-react";
import { getHeatmap, getWorkers, type GeoJSONFeatureCollection, type Worker } from "@/lib/api";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const BOUNDS_PADDING = { top: 60, bottom: 60, left: 60, right: 60 };
const DEFAULT_VIEW = { longitude: 7.0, latitude: 51.4, zoom: 7 };

// Simple marker icon as data URL (small circle)
const MARKER_DATA_URL =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="%2324a0ed" stroke="%23fff" stroke-width="2"/></svg>'
  );

function buildLayers(
  heatmapData: GeoJSONFeatureCollection | null,
  workers: Worker[],
  setHoverInfo: (info: { worker: Worker } | null) => void
) {
  const layers = [];

  if (heatmapData?.features?.length) {
    layers.push(
      new HeatmapLayer({
        id: "heatmap",
        data: heatmapData.features,
        getPosition: (d) => d.geometry.coordinates,
        getWeight: (d) => d.properties.weight,
        radiusPixels: 30,
        colorRange: [
          [0, 26, 152, 180],
          [65, 105, 225, 200],
          [34, 139, 34, 220],
          [255, 215, 0, 240],
          [255, 140, 0, 255],
          [255, 69, 0, 255],
        ],
        intensity: 1.2,
        threshold: 0.05,
        aggregation: "SUM",
      })
    );
  }

  const workersWithLocation = workers.filter(
    (w) => w.current_location?.longitude != null && w.current_location?.latitude != null
  );
  if (workersWithLocation.length > 0) {
    layers.push(
      new IconLayer({
        id: "workers",
        data: workersWithLocation,
        getPosition: (d) => [d.current_location!.longitude, d.current_location!.latitude],
        getIcon: () => ({ url: MARKER_DATA_URL, width: 24, height: 24 }),
        getSize: 28,
        getColor: () => [36, 160, 237, 255],
        pickable: true,
        onHover: (info) => {
          setHoverInfo(info.object ? { worker: info.object as Worker } : null);
        },
      })
    );
  }

  return layers;
}

function getBounds(
  heatmapData: GeoJSONFeatureCollection | null,
  workers: Worker[]
): [[number, number], [number, number]] | null {
  const points: [number, number][] = [];
  heatmapData?.features?.forEach((f) => {
    points.push(f.geometry.coordinates);
  });
  workers.forEach((w) => {
    if (w.current_location?.longitude != null && w.current_location?.latitude != null) {
      points.push([w.current_location.longitude, w.current_location.latitude]);
    }
  });
  if (points.length === 0) return null;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  return [[minLng, minLat], [maxLng, maxLat]];
}

export function MapPage() {
  const mapRef = useRef<MapRef | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [heatmapData, setHeatmapData] = useState<GeoJSONFeatureCollection | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ worker: Worker } | null>(null);
  const boundsFittedRef = useRef(false);
  const mapLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getHeatmap(), getWorkers()])
      .then(([geo, w]) => {
        if (!cancelled) {
          setHeatmapData(geo);
          setWorkers(w);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const layers = buildLayers(heatmapData, workers, setHoverInfo);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || overlayRef.current) return;
    mapLoadedRef.current = true;
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers,
    });
    overlayRef.current = overlay;
    map.addControl(overlay);
    const bounds = getBounds(heatmapData, workers);
    if (bounds && !boundsFittedRef.current) {
      map.fitBounds(bounds, { padding: BOUNDS_PADDING, maxZoom: 14 });
      boundsFittedRef.current = true;
    }
  }, [heatmapData, workers]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers });
    }
  }, [heatmapData, workers]);

  // Fit map bounds to data once when map and data are ready
  useEffect(() => {
    if (!mapLoadedRef.current || boundsFittedRef.current) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const bounds = getBounds(heatmapData, workers);
    if (bounds) {
      map.fitBounds(bounds, { padding: BOUNDS_PADDING, maxZoom: 14 });
      boundsFittedRef.current = true;
    }
  }, [heatmapData, workers]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full overflow-hidden rounded-card border bg-card">
      {!MAPBOX_TOKEN && (
        <div className="absolute left-0 right-0 top-0 z-10 bg-amber-500/90 px-4 py-2 text-center text-sm text-amber-950">
          Set VITE_MAPBOX_TOKEN in .env to show the map.
        </div>
      )}
      {MAPBOX_TOKEN && (
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={DEFAULT_VIEW}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
          onLoad={onMapLoad}
        />
      )}
      {hoverInfo && (
        <div
          className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border bg-card px-3 py-2 text-sm shadow-soft"
          style={{ pointerEvents: "none" }}
        >
          <div className="font-medium">{hoverInfo.worker.name}</div>
          <div className="text-muted-foreground">
            {hoverInfo.worker.is_available ? "Available" : "On shift"}
          </div>
        </div>
      )}
      {/* Heatmap legend */}
      {MAPBOX_TOKEN && (heatmapData?.features?.length ?? 0) > 0 && (
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-border/80 bg-card/95 px-3 py-2 shadow-soft backdrop-blur-sm">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Shift density</div>
          <div
            className="h-3 w-24 rounded-full"
            style={{
              background:
                "linear-gradient(to right, rgb(0 26 152 / 0.9), rgb(65 105 225), rgb(34 139 34), rgb(255 215 0), rgb(255 140 0), rgb(255 69 0))",
            }}
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  );
}
