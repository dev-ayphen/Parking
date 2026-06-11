import React, { forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * OpenStreetMap map rendered with Leaflet inside a WebView.
 * No API key required — tiles come from openstreetmap.org.
 *
 * Drop-in alternative to react-native-maps for Expo Go on Android/iOS.
 * Supports: markers (with price pills / custom labels), a radius circle,
 * tap-to-deselect, tap-to-pick (location picker), and imperative recenter.
 */

export interface LeafletMarker {
  id: string | number;
  lat: number;
  lng: number;
  /** 'user' = blue dot, 'pin' = pink teardrop, 'price' = card bubble */
  kind?: 'user' | 'pin' | 'price';
  label?: string;          // price text, e.g. "₹30 /hr"
  spots?: number;          // available spot count
  rating?: number;         // optional star rating (shown if > 0)
  status?: 'available' | 'booked';
  selected?: boolean;
}

export interface LeafletCircle {
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface LeafletMapHandle {
  /** Recenter + zoom the map to fit a region (latDelta ~ visible span). */
  animateToRegion: (r: { latitude: number; longitude: number; latitudeDelta: number }) => void;
}

interface LeafletMapProps {
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number };
  markers?: LeafletMarker[];
  circle?: LeafletCircle | null;
  interactive?: boolean;            // false = static (no pan/zoom)
  onMarkerPress?: (id: string | number) => void;
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  style?: any;
}

// Convert a latitudeDelta to an approximate Leaflet zoom level
const deltaToZoom = (latDelta: number) => {
  // latDelta 0.01 ≈ zoom 14, doubles each level
  const z = Math.round(Math.log2(360 / latDelta));
  return Math.max(3, Math.min(18, z));
};

const buildHtml = (
  region: { latitude: number; longitude: number; latitudeDelta: number },
  interactive: boolean,
) => {
  const zoom = deltaToZoom(region.latitudeDelta);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background:#e5e7eb; }

    /* ── Card bubble ─────────────────────────────────────────────────── */
    .park-card {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transform: translate(-50%, calc(-100% - 14px));
      background: #fff;
      border-radius: 8px;
      padding: 4px 8px 4px 4px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.10);
      border: 1.5px solid #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-width: 70px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    /* Green border tint for available */
    .park-card.available { border-color: #86EFAC; }
    /* Red border tint for booked */
    .park-card.booked    { border-color: #FECACA; }

    /* Selected: slightly larger, stronger shadow */
    .park-card.selected {
      transform: translate(-50%, calc(-100% - 14px)) scale(1.08);
      z-index: 1000;
      box-shadow: 0 4px 14px rgba(0,0,0,0.22);
    }

    /* P icon circle */
    .park-icon {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 11px; color: #fff;
      flex-shrink: 0;
    }
    .available .park-icon { background: #16A34A; }
    .booked    .park-icon { background: #DC2626; }

    /* Text block */
    .park-info { display: flex; flex-direction: column; line-height: 1.1; gap: 1px; }
    .park-price {
      font-size: 11px; font-weight: 800; color: #0F172A; letter-spacing: -0.2px;
    }
    .park-price .per-hr { font-weight: 500; color: #64748B; font-size: 9px; }
    .park-spots {
      font-size: 9px; color: #64748B; font-weight: 500; margin-top: 0px;
    }
    /* "BOOKED / No spots" text */
    .park-price.booked-label { color: #DC2626; font-size: 12px; letter-spacing: 0.3px; }
    .park-spots.no-spots     { color: #94A3B8; }

    /* Optional star rating inline */
    .park-rating { font-size: 10px; color: #64748B; }
    .park-rating .star { color: #FBBF24; }

    /* ── Tail ────────────────────────────────────────────────────────── */
    /* Outer white fill (covers the dot stem) */
    .park-card::before {
      content: ''; position: absolute;
      left: 50%; bottom: -6px; transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 5px solid transparent; border-right: 5px solid transparent;
      border-top: 7px solid #fff;
    }
    /* Inner border-colour triangle */
    .park-card::after {
      content: ''; position: absolute;
      left: 50%; bottom: -8px; transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 6px solid transparent; border-right: 6px solid transparent;
    }
    .park-card.available::after { border-top: 8px solid #86EFAC; }
    .park-card.booked::after    { border-top: 8px solid #FECACA; }

    /* ── Anchor dot ──────────────────────────────────────────────────── */
    .park-dot {
      position: absolute;
      left: 50%; top: calc(100% + 7px);
      transform: translateX(-50%);
      width: 8px; height: 8px; border-radius: 50%;
      border: 1.5px solid #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.25);
    }
    .available .park-dot { background: #16A34A; }
    .booked    .park-dot { background: #DC2626; }

    .pink-pin { width:24px; height:24px; }
    .leaflet-control-attribution { font-size:8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      dragging: ${interactive},
      scrollWheelZoom: ${interactive},
      doubleClickZoom: ${interactive},
      touchZoom: ${interactive},
      tap: ${interactive}
    }).setView([${region.latitude}, ${region.longitude}], ${zoom});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(map);

    var markerLayer = L.layerGroup().addTo(map);
    var circleLayer = L.layerGroup().addTo(map);

    function send(obj){
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }

    // Tap on empty map
    map.on('click', function(e){
      send({ type:'mapPress', lat:e.latlng.lat, lng:e.latlng.lng });
    });

    function pinIcon(){
      return L.divIcon({ className:'', html:
        '<svg class="pink-pin" viewBox="0 0 24 24" fill="#DC0159" stroke="#fff" stroke-width="1.5">'+
        '<path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/>'+
        '<circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>',
        iconSize:[24,24], iconAnchor:[12,24] });
    }
    function userIcon(){
      return L.divIcon({ className:'', html:
        '<div style="width:18px;height:18px;border-radius:9px;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,0.3)"></div>',
        iconSize:[18,18], iconAnchor:[9,9] });
    }
    function priceIcon(label, status, selected, spots, rating){
      var isBooked = status === 'booked';
      var statusCls = isBooked ? 'booked' : 'available';
      var selCls    = selected ? ' selected' : '';

      // Price row: "₹30 /hr" or "BOOKED"
      var priceHtml = isBooked
        ? '<span class="park-price booked-label">BOOKED</span>'
        : '<span class="park-price">' + (label || '') + '<span class="per-hr"> /hr</span></span>';

      // Spots row
      var spotsText = isBooked
        ? '<span class="park-spots no-spots">No spots</span>'
        : (spots !== undefined && spots !== null
            ? ('<span class="park-spots">' + spots + ' spot' + (spots !== 1 ? 's' : '') +
               (rating > 0 ? ' &bull; <span class="star">&#9733;</span> ' + rating.toFixed(1) : '') +
               '</span>')
            : '');

      var html =
        '<div class="park-card ' + statusCls + selCls + '">' +
          '<div class="park-icon">P</div>' +
          '<div class="park-info">' + priceHtml + spotsText + '</div>' +
          '<div class="park-dot"></div>' +
        '</div>';

      // anchor [0,0] → CSS handles positioning via translate
      return L.divIcon({ className:'', html: html, iconSize:[0,0], iconAnchor:[0,0] });
    }

    function renderMarkers(list){
      markerLayer.clearLayers();
      list.forEach(function(m){
        var icon;
        if (m.kind==='user') icon = userIcon();
        else if (m.kind==='price') icon = priceIcon(m.label||'', m.status, m.selected, m.spots, m.rating||0);
        else icon = pinIcon();
        var mk = L.marker([m.lat, m.lng], { icon: icon }).addTo(markerLayer);
        mk.on('click', function(ev){
          if (ev.originalEvent) ev.originalEvent.stopPropagation();
          send({ type:'markerPress', id:m.id });
        });
      });
    }

    function renderCircle(c){
      circleLayer.clearLayers();
      if (!c) return;
      L.circle([c.lat, c.lng], {
        radius: c.radiusMeters,
        color:'rgba(99,102,241,0.55)', weight:1.5,
        fillColor:'rgba(99,102,241,1)', fillOpacity:0.12
      }).addTo(circleLayer);
    }

    function recenter(lat, lng, latDelta){
      var z = Math.round(Math.log2(360/latDelta));
      z = Math.max(3, Math.min(18, z));
      map.setView([lat, lng], z, { animate:true });
    }

    // Receive commands from React Native
    function handleMessage(raw){
      try {
        var msg = JSON.parse(raw);
        if (msg.type==='markers') renderMarkers(msg.markers||[]);
        else if (msg.type==='circle') renderCircle(msg.circle);
        else if (msg.type==='recenter') recenter(msg.lat, msg.lng, msg.latDelta);
      } catch(e){}
    }
    document.addEventListener('message', function(e){ handleMessage(e.data); });
    window.addEventListener('message', function(e){ handleMessage(e.data); });

    send({ type:'ready' });
  </script>
</body>
</html>`;
};

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>((props, ref) => {
  const {
    initialRegion, markers = [], circle = null,
    interactive = true, onMarkerPress, onMapPress, style,
  } = props;

  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  // Build the HTML once (initial region). Subsequent updates go via postMessage.
  const html = useMemo(() => buildHtml(initialRegion, interactive), []); // eslint-disable-line react-hooks/exhaustive-deps

  const post = useCallback((obj: any) => {
    webRef.current?.injectJavaScript(
      `(function(){ handleMessage(${JSON.stringify(JSON.stringify(obj))}); })(); true;`
    );
  }, []);

  // Push marker/circle updates whenever they change (and after ready)
  const pushState = useCallback(() => {
    post({ type: 'markers', markers });
    post({ type: 'circle', circle });
  }, [post, markers, circle]);

  React.useEffect(() => {
    if (readyRef.current) pushState();
  }, [pushState]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (r) => {
      post({ type: 'recenter', lat: r.latitude, lng: r.longitude, latDelta: r.latitudeDelta });
    },
  }), [post]);

  const onMessage = useCallback((e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        readyRef.current = true;
        pushState();
      } else if (msg.type === 'markerPress') {
        onMarkerPress?.(msg.id);
      } else if (msg.type === 'mapPress') {
        onMapPress?.({ latitude: msg.lat, longitude: msg.lng });
      }
    } catch {}
  }, [pushState, onMarkerPress, onMapPress]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={onMessage}
        androidLayerType="hardware"
      />
    </View>
  );
});

LeafletMap.displayName = 'LeafletMap';

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#e5e7eb' },
});

export default LeafletMap;
