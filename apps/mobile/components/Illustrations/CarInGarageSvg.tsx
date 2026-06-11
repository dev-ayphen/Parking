import React from 'react';
import Svg, { G, Path, Rect, Circle, Defs, LinearGradient, RadialGradient, Stop, Ellipse } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
  primaryColor?: string;
}

const CarInGarageSvg: React.FC<Props> = ({ width = 80, height = 64, primaryColor = '#059669' }) => {
  const hi  = '#6EE7B7';   // highlight
  const mid = primaryColor;
  const drk = '#065F46';   // shadow/dark face
  const whl = '#1E293B';
  const rim = '#94A3B8';
  const glz = 'rgba(186,230,255,0.75)';

  return (
    <Svg width={width} height={height} viewBox="0 0 100 80">
      <Defs>
        <LinearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={hi}  />
          <Stop offset="45%"  stopColor={mid} />
          <Stop offset="100%" stopColor={drk} />
        </LinearGradient>
        <LinearGradient id="hoodG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={hi}  />
          <Stop offset="100%" stopColor={mid} />
        </LinearGradient>
        <LinearGradient id="roofG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={hi}  stopOpacity="0.9" />
          <Stop offset="100%" stopColor={mid} />
        </LinearGradient>
        <RadialGradient id="shadowG" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%"   stopColor="#000" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#000" stopOpacity="0"    />
        </RadialGradient>
        <LinearGradient id="windG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%"   stopColor="#DBEAFE" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#93C5FD" stopOpacity="0.6" />
        </LinearGradient>
        <LinearGradient id="rimG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%"   stopColor="#E2E8F0" />
          <Stop offset="100%" stopColor="#94A3B8" />
        </LinearGradient>
      </Defs>

      {/* ── Ground shadow ── */}
      <Ellipse cx="50" cy="76" rx="38" ry="4" fill="url(#shadowG)" />

      {/* ══════════════════════════════════
          BODY — clean sedan silhouette
      ══════════════════════════════════ */}

      {/* Lower body */}
      <Path
        d="M10 54 Q10 46 18 46 L82 46 Q90 46 90 54 L90 68 Q90 72 86 72 L14 72 Q10 72 10 68 Z"
        fill="url(#bodyG)"
      />

      {/* Hood (front slope) */}
      <Path
        d="M18 46 Q22 38 30 36 L70 36 Q78 38 82 46 Z"
        fill="url(#hoodG)"
      />

      {/* Roof */}
      <Path
        d="M33 36 Q36 26 42 24 L58 24 Q64 26 67 36 Z"
        fill="url(#roofG)"
      />

      {/* ── Windshield ── */}
      <Path
        d="M35 36 Q38 28 43 26 L57 26 Q62 28 65 36 Z"
        fill="url(#windG)"
      />
      {/* Windshield glare */}
      <Path
        d="M37 35 Q39 30 43 28 L50 28 L48 35 Z"
        fill="rgba(255,255,255,0.45)"
      />

      {/* ── Side windows ── */}
      <Path d="M18 46 Q22 39 30 37 L40 37 L38 46 Z" fill={glz} />
      <Path d="M40 37 L60 37 L58 46 L38 46 Z"       fill={glz} />
      <Path d="M60 37 L70 37 Q78 39 82 46 L62 46 Z"  fill={glz} />
      {/* Window dividers */}
      <Path d="M40 37 L38 46" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <Path d="M60 37 L62 46" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

      {/* ── A-pillar / C-pillar lines ── */}
      <Path d="M33 36 L35 36" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      <Path d="M67 36 L65 36" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />

      {/* ── Body crease highlight ── */}
      <Path
        d="M14 57 Q50 54 86 57"
        stroke={hi} strokeWidth="1" strokeOpacity="0.45" fill="none"
      />

      {/* ── Door seams ── */}
      <Path d="M38 46 L37 68" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
      <Path d="M62 46 L63 68" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />

      {/* ── Door handles ── */}
      <Rect x="41" y="58" width="9"  height="2" rx="1" fill="rgba(255,255,255,0.5)" />
      <Rect x="50" y="58" width="9"  height="2" rx="1" fill="rgba(255,255,255,0.5)" />

      {/* ── Headlights ── */}
      <Path d="M10 50 Q10 47 13 47 L22 47 L20 54 L10 54 Z" fill="#FEF9C3" opacity="0.9" />
      <Path d="M11 49 L20 49 L19 52 L11 52 Z" fill="#FDE68A" opacity="0.8" />
      {/* DRL */}
      <Path d="M11 54 L20 54" stroke="#FEF08A" strokeWidth="1.2" strokeOpacity="0.7" />

      {/* ── Tail lights ── */}
      <Path d="M90 50 Q90 47 87 47 L78 47 L80 54 L90 54 Z" fill="#FCA5A5" opacity="0.9" />
      <Path d="M89 49 L80 49 L81 52 L89 52 Z" fill="#F87171" opacity="0.8" />

      {/* ── Front grille ── */}
      <Path
        d="M30 66 Q30 63 34 63 L66 63 Q70 63 70 66 L70 68 Q70 70 66 70 L34 70 Q30 70 30 68 Z"
        fill={drk} opacity="0.55"
      />
      <Rect x="32" y="64.5" width="36" height="1.5" rx="0.75" fill="rgba(255,255,255,0.2)" />
      <Rect x="32" y="67"   width="36" height="1.5" rx="0.75" fill="rgba(255,255,255,0.2)" />
      {/* Bumper */}
      <Path
        d="M14 68 Q14 72 18 72 L82 72 Q86 72 86 68"
        stroke={drk} strokeWidth="1.5" fill="none" strokeOpacity="0.4"
      />

      {/* ══════════════════════════════════
          WHEELS
      ══════════════════════════════════ */}

      {/* Front wheel */}
      <Circle cx="27" cy="70" r="10" fill={whl} />
      <Circle cx="27" cy="70" r="7.5" fill="#2D3748" />
      {/* Spokes */}
      {[0,60,120,180,240,300].map((deg, i) => {
        const r = Math.PI * deg / 180;
        const x1 = 27 + 2   * Math.cos(r);
        const y1 = 70 + 2   * Math.sin(r);
        const x2 = 27 + 6.5 * Math.cos(r);
        const y2 = 70 + 6.5 * Math.sin(r);
        return <Path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke={rim} strokeWidth="1.2" />;
      })}
      <Circle cx="27" cy="70" r="2.5" fill="url(#rimG)" />
      <Circle cx="27" cy="70" r="1"   fill="#E2E8F0" />

      {/* Rear wheel */}
      <Circle cx="73" cy="70" r="10" fill={whl} />
      <Circle cx="73" cy="70" r="7.5" fill="#2D3748" />
      {[0,60,120,180,240,300].map((deg, i) => {
        const r = Math.PI * deg / 180;
        const x1 = 73 + 2   * Math.cos(r);
        const y1 = 70 + 2   * Math.sin(r);
        const x2 = 73 + 6.5 * Math.cos(r);
        const y2 = 70 + 6.5 * Math.sin(r);
        return <Path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke={rim} strokeWidth="1.2" />;
      })}
      <Circle cx="73" cy="70" r="2.5" fill="url(#rimG)" />
      <Circle cx="73" cy="70" r="1"   fill="#E2E8F0" />

      {/* Wheel arch shadow */}
      <Path d="M16 68 Q17 60 27 60 Q37 60 38 68" fill={drk} opacity="0.2" />
      <Path d="M62 68 Q63 60 73 60 Q83 60 84 68" fill={drk} opacity="0.2" />
    </Svg>
  );
};

export default CarInGarageSvg;
