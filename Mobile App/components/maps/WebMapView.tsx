import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type WebMapPoint = { lat: number; lng: number };

export type WebMapMarker = WebMapPoint & {
  color?: string;
  kind?: 'pickup' | 'provider';
};

export type WebMapCircle = WebMapPoint & {
  radiusM: number;
  strokeColor?: string;
  fillColor?: string;
  strokeOpacity?: number;
};

export type WebMapPolyline = {
  points: WebMapPoint[];
  color?: string;
  weight?: number;
  opacity?: number;
};

export type WebMapState = {
  center: WebMapPoint;
  zoom: number;
  scheme?: 'light' | 'dark';
  markers?: WebMapMarker[];
  circles?: WebMapCircle[];
  polylines?: WebMapPolyline[];
  fitBounds?: WebMapPoint[];
};

type WebMapViewProps = WebMapState & {
  width: number;
  height: number;
};

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #f3f4f6; }
    .leaflet-control-attribution { font-size: 8px; opacity: 0.65; }
    .leaflet-control-zoom { display: none; }
    @keyframes radarPulse {
      0% { transform: scale(0.45); opacity: 0.42; }
      100% { transform: scale(1.35); opacity: 0; }
    }
    .radar-ring {
      position: absolute;
      width: 120px;
      height: 120px;
      margin-left: -60px;
      margin-top: -60px;
      border-radius: 50%;
      border: 2px solid rgba(37,99,235,0.55);
      background: rgba(37,99,235,0.12);
      animation: radarPulse 2.2s ease-out infinite;
      pointer-events: none;
    }
    .radar-ring.delay { animation-delay: 1.1s; }
    .pin-wrap { position: relative; width: 48px; height: 64px; }
    .pin-head {
      width: 34px; height: 34px; border-radius: 17px; margin: 0 auto;
      border: 3px solid #fff; box-shadow: 0 4px 14px rgba(15,23,42,.28);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 14px; font-weight: 700;
    }
    .pin-stem { width: 3px; height: 12px; margin: -1px auto 0; border-radius: 2px; }
    .pin-dot { width: 10px; height: 10px; border-radius: 5px; margin: -1px auto 0; border: 2px solid #fff; }
    .provider-wrap { position: relative; width: 52px; height: 52px; }
    .provider-halo {
      position: absolute; inset: 0; border-radius: 50%;
      border: 2px solid rgba(37,99,235,.35); background: rgba(37,99,235,.12);
    }
    .provider-badge {
      position: absolute; inset: 6px; border-radius: 50%; background: #fff;
      border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15,23,42,.22);
      display: flex; align-items: center; justify-content: center; font-size: 16px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map;
    let layerGroups = { markers: null, circles: null, polylines: null, radar: null };
    let tileLayer = null;

    function ensureMap() {
      if (map) return map;
      map = L.map('map', { zoomControl: false, attributionControl: true });
      tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);
      layerGroups.markers = L.layerGroup().addTo(map);
      layerGroups.circles = L.layerGroup().addTo(map);
      layerGroups.polylines = L.layerGroup().addTo(map);
      layerGroups.radar = L.layerGroup().addTo(map);
      return map;
    }

    function setTiles(scheme) {
      if (!map) return;
      const dark = scheme === 'dark';
      const url = dark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      if (tileLayer) map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(url, { maxZoom: 20, attribution: '&copy; CARTO' }).addTo(map);
    }

    function pickupHtml(color) {
      return '<div class="pin-wrap"><div class="pin-head" style="background:' + color + '">●</div>' +
        '<div class="pin-stem" style="background:' + color + '"></div>' +
        '<div class="pin-dot" style="background:' + color + '"></div></div>';
    }

    function providerHtml(color) {
      return '<div class="provider-wrap"><div class="provider-halo"></div>' +
        '<div class="provider-badge" style="color:' + color + '">🚗</div></div>';
    }

    window.__setMapState = function(state) {
      const m = ensureMap();
      if (state.scheme) setTiles(state.scheme);
      layerGroups.markers.clearLayers();
      layerGroups.circles.clearLayers();
      layerGroups.polylines.clearLayers();
      layerGroups.radar.clearLayers();

      (state.markers || []).forEach(function(item) {
        const color = item.color || '#2563EB';
        const html = item.kind === 'provider' ? providerHtml(color) : pickupHtml(color);
        const anchor = item.kind === 'provider' ? [26, 26] : [24, 58];
        L.marker([item.lat, item.lng], {
          icon: L.divIcon({
            className: '',
            html: html,
            iconSize: item.kind === 'provider' ? [52, 52] : [48, 64],
            iconAnchor: anchor
          })
        }).addTo(layerGroups.markers);
      });

      if ((state.circles || []).length > 0 && state.circles[0]) {
        const c = state.circles[0];
        const color = c.strokeColor || '#2563EB';
        const radarHtml = '<div style="position:relative;width:1px;height:1px">' +
          '<div class="radar-ring" style="border-color:' + color + ';background:rgba(37,99,235,0.1)"></div>' +
          '<div class="radar-ring delay" style="border-color:' + color + ';background:rgba(37,99,235,0.1)"></div>' +
          '</div>';
        L.marker([c.lat, c.lng], {
          icon: L.divIcon({ className: '', html: radarHtml, iconSize: [1, 1], iconAnchor: [0, 0] })
        }).addTo(layerGroups.radar);
      }

      (state.circles || []).forEach(function(item) {
        L.circle([item.lat, item.lng], {
          radius: item.radiusM,
          color: item.strokeColor || '#2563EB',
          opacity: item.strokeOpacity == null ? 0.5 : item.strokeOpacity,
          weight: 2,
          fillColor: item.fillColor || 'rgba(37,99,235,0.15)',
          fillOpacity: 1
        }).addTo(layerGroups.circles);
      });

      (state.polylines || []).forEach(function(line) {
        if (!line.points || line.points.length < 2) return;
        L.polyline(line.points.map(function(p) { return [p.lat, p.lng]; }), {
          color: line.color || '#2563EB',
          weight: line.weight || 4,
          opacity: line.opacity == null ? 0.9 : line.opacity,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroups.polylines);
      });

      if (state.fitBounds && state.fitBounds.length > 1) {
        const bounds = L.latLngBounds(state.fitBounds.map(function(p) { return [p.lat, p.lng]; }));
        m.fitBounds(bounds, { padding: [56, 56], animate: false });
      } else if (state.center) {
        m.setView([state.center.lat, state.center.lng], state.zoom || 15, { animate: false });
      }
    };

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
  </script>
</body>
</html>`;

export function WebMapView({
  width,
  height,
  center,
  zoom,
  scheme = 'light',
  markers,
  circles,
  polylines,
  fitBounds,
}: WebMapViewProps) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const state = useMemo<WebMapState>(
    () => ({
      center,
      zoom,
      scheme,
      markers,
      circles,
      polylines,
      fitBounds,
    }),
    [center.lat, center.lng, zoom, scheme, markers, circles, polylines, fitBounds],
  );

  const stateJson = useMemo(() => JSON.stringify(state), [state]);

  useEffect(() => {
    if (!readyRef.current) return;
    webRef.current?.injectJavaScript(`window.__setMapState(${stateJson}); true;`);
  }, [stateJson]);

  return (
    <View style={[styles.shell, { width, height }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: LEAFLET_HTML }}
        style={{ width, height }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onMessage={(event) => {
          if (event.nativeEvent.data === 'ready') {
            readyRef.current = true;
            webRef.current?.injectJavaScript(`window.__setMapState(${stateJson}); true;`);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
});
