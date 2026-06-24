import React, { forwardRef, useImperativeHandle, useRef, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { WifiOff, RefreshCw } from 'lucide-react-native';

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
  status?: 'available' | 'booked' | 'closed';
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
  /** Fires after a USER pan/zoom (not programmatic recenters) with the new center. */
  onRegionChange?: (coord: { latitude: number; longitude: number }) => void;
  style?: any;
}

// Convert a latitudeDelta to a Leaflet zoom level.
// FRACTIONAL (not rounded): rounding to integers collapsed adjacent radii onto
// the same zoom — e.g. 3 km and 5 km both snapped to zoom 12, making the 3 km
// circle look the same size as (or bigger than) the 5 km one. A fractional zoom
// frames every radius proportionally (the circle is always ~the same % of the
// screen). Requires zoomSnap:0 on the map so Leaflet honours non-integer zooms.
const deltaToZoom = (latDelta: number) => {
  const z = Math.log2(360 / latDelta);
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
    /* Grey tint + dimmed for closed (outside operating hours) */
    .park-card.closed    { border-color: #CBD5E1; opacity: 0.92; }

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
    .closed    .park-icon { background: #94A3B8; }

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
    /* "CLOSED" text */
    .park-price.closed-label { color: #64748B; font-size: 12px; letter-spacing: 0.3px; }

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
    .park-card.closed::after    { border-top: 8px solid #CBD5E1; }

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
    .closed    .park-dot { background: #94A3B8; }

    .pink-pin { width:24px; height:24px; }
    .leaflet-control-attribution { font-size:8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Lightweight bridge available even if Leaflet's CDN never loads, so we can
    // always report a failure back to React Native (which shows the retry overlay).
    function postNative(obj){
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
    // If the Leaflet script tag fails (offline / CDN down), tell RN.
    window.__leafletScriptFailed = function(){ postNative({ type:'loadError', reason:'lib' }); };
  </script>
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    onerror="window.__leafletScriptFailed()"></script>
  <script>
    // Guard: if Leaflet didn't load (e.g. offline), bail out cleanly with a
    // failure signal instead of throwing "L is not defined" and leaving grey.
    if (typeof L === 'undefined') {
      postNative({ type:'loadError', reason:'lib' });
    } else {
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      // zoomSnap:0 lets the map sit at a FRACTIONAL zoom (e.g. 12.44) so each
      // search radius frames its circle proportionally instead of snapping to a
      // coarse integer zoom (which made 3 km and 5 km look the same size).
      zoomSnap: 0,
      dragging: ${interactive},
      scrollWheelZoom: ${interactive},
      doubleClickZoom: ${interactive},
      touchZoom: ${interactive},
      tap: ${interactive}
    }).setView([${region.latitude}, ${region.longitude}], ${zoom});

    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(map);

    // Tile-level failure detection: if NO tile loads within a few seconds (offline
    // even though Leaflet itself was cached), surface the same retry overlay.
    var anyTileLoaded = false;
    tiles.on('load', function(){ anyTileLoaded = true; });
    tiles.on('tileload', function(){ anyTileLoaded = true; });
    setTimeout(function(){
      if (!anyTileLoaded) postNative({ type:'loadError', reason:'tiles' });
    }, 6000);

    var markerLayer = L.layerGroup().addTo(map);
    var circleLayer = L.layerGroup().addTo(map);

    function send(obj){
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }

    // Tap on empty map
    map.on('click', function(e){
      send({ type:'mapPress', lat:e.latlng.lat, lng:e.latlng.lng });
    });

    // Report user-driven pans/zooms (drag, pinch) so the app can offer a
    // "Search this area" action. We skip programmatic recenters (setView) by
    // flagging them — only a real user gesture sets dragging=true.
    var userMoved = false;
    map.on('dragstart zoomstart', function(){ userMoved = true; });
    map.on('moveend', function(){
      if (!userMoved) return;
      userMoved = false;
      var c = map.getCenter();
      send({ type:'regionChange', lat:c.lat, lng:c.lng });
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
      var isClosed = status === 'closed';
      var isBooked = status === 'booked';
      var statusCls = isClosed ? 'closed' : (isBooked ? 'booked' : 'available');
      var selCls    = selected ? ' selected' : '';

      // Price row: "CLOSED", "BOOKED", or the rate "₹30 /hr"
      var priceHtml = isClosed
        ? '<span class="park-price closed-label">CLOSED</span>'
        : isBooked
          ? '<span class="park-price booked-label">BOOKED</span>'
          : '<span class="park-price">' + (label || '') + '<span class="per-hr"> /hr</span></span>';

      // Spots row: closed shows "Outside hours", booked "No spots", else count
      var spotsText = isClosed
        ? '<span class="park-spots no-spots">Outside hours</span>'
        : isBooked
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
        color:'rgba(220,1,89,0.45)', weight:1.5,
        fillColor:'#DC0159', fillOpacity:0.06
      }).addTo(circleLayer);
    }

    function recenter(lat, lng, latDelta){
      // Fractional zoom (no rounding) so each radius frames its circle the same
      // way — matches deltaToZoom on the RN side. zoomSnap:0 makes this honoured.
      var z = Math.log2(360/latDelta);
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
    } // end: Leaflet-loaded guard
  </script>
</body>
</html>`;
};

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>((props, ref) => {
  const {
    initialRegion, markers = [], circle = null,
    interactive = true, onMarkerPress, onMapPress, onRegionChange, style,
  } = props;

  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  // If animateToRegion is called before the map is ready (e.g. GPS resolves faster
  // than the WebView initialises), store it here and replay on the 'ready' event.
  const pendingRecenterRef = useRef<{ lat: number; lng: number; latDelta: number } | null>(null);

  // Offline / load-failure state. When the Leaflet CDN or the map tiles can't be
  // fetched (no connection), we show a "Map unavailable" overlay with Retry
  // instead of a bare grey box. `reloadKey` remounts the WebView to re-run the HTML.
  const [mapError, setMapError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    readyRef.current = false;
    pendingRecenterRef.current = null;
    setMapError(false);
    setReloadKey((k) => k + 1); // fresh WebView → re-attempts the CDN/tile loads
  }, []);

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
      if (readyRef.current) {
        post({ type: 'recenter', lat: r.latitude, lng: r.longitude, latDelta: r.latitudeDelta });
      } else {
        // Map not ready yet (WebView still loading) — queue the recenter so it
        // fires as soon as Leaflet signals 'ready'. This covers the race between
        // the GPS permission flow resolving and the WebView finishing init.
        pendingRecenterRef.current = { lat: r.latitude, lng: r.longitude, latDelta: r.latitudeDelta };
      }
    },
  }), [post]);

  const onMessage = useCallback((e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        readyRef.current = true;
        setMapError(false); // map came up fine
        pushState();
        // Replay any recenter that was queued before the map was ready
        if (pendingRecenterRef.current) {
          const r = pendingRecenterRef.current;
          pendingRecenterRef.current = null;
          post({ type: 'recenter', lat: r.lat, lng: r.lng, latDelta: r.latDelta });
        }
      } else if (msg.type === 'loadError') {
        // Leaflet lib or tiles failed to load (offline / CDN down).
        setMapError(true);
      } else if (msg.type === 'markerPress') {
        onMarkerPress?.(msg.id);
      } else if (msg.type === 'mapPress') {
        onMapPress?.({ latitude: msg.lat, longitude: msg.lng });
      } else if (msg.type === 'regionChange') {
        onRegionChange?.({ latitude: msg.lat, longitude: msg.lng });
      }
    } catch {}
  }, [pushState, onMarkerPress, onMapPress, onRegionChange]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ html }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={onMessage}
        androidLayerType="hardware"
        // Native-level failures (DNS/connection error loading the document, HTTP
        // error, or the WebView renderer crashing) → same offline overlay.
        onError={() => setMapError(true)}
        onHttpError={() => setMapError(true)}
        onRenderProcessGone={() => setMapError(true)}
      />

      {mapError && (
        <View style={styles.errorOverlay} pointerEvents="auto">
          <WifiOff size={30} color="#94A3B8" />
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorSub}>Check your internet connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.85}>
            <RefreshCw size={15} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

LeafletMap.displayName = 'LeafletMap';

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#e5e7eb' },
  errorOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 6,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  errorSub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#DC0159',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
});

export default LeafletMap;
