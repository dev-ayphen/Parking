import React from 'react';
import Svg, {
  G, Circle, Path, Rect, Defs, LinearGradient, Stop, Ellipse, ClipPath,
} from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
  primaryColor?: string;
}

const MagnifyingGlassSvg: React.FC<Props> = ({
  width = 90,
  height = 70,
  primaryColor = '#DC0159',
}) => {
  const light = primaryColor + '28';
  const mid   = primaryColor + '55';

  return (
    <Svg width={width} height={height} viewBox="0 0 120 90">
      <Defs>
        {/* Pink-tinted map bg */}
        <LinearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFF1F5" />
          <Stop offset="100%" stopColor="#FFE4ED" />
        </LinearGradient>
        {/* Glass lens */}
        <LinearGradient id="lens" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.18" />
        </LinearGradient>
        {/* Handle gradient */}
        <LinearGradient id="handle" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={primaryColor} />
          <Stop offset="100%" stopColor={primaryColor + 'AA'} />
        </LinearGradient>
        {/* Pin gradient */}
        <LinearGradient id="pin" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F43F5E" />
          <Stop offset="100%" stopColor="#BE123C" />
        </LinearGradient>
        {/* Road colour */}
        <ClipPath id="mapClip">
          <Rect x="8" y="6" width="70" height="68" rx="12" />
        </ClipPath>
      </Defs>

      {/* ── Map card ─────────────────────────────────── */}
      <Rect x="8" y="6" width="70" height="68" rx="12" fill="url(#mapBg)" />

      {/* Grid roads */}
      <G clipPath="url(#mapClip)" opacity="0.4">
        <Rect x="29" y="6"  width="5" height="68" rx="2" fill="#FECDD3" />
        <Rect x="51" y="6"  width="5" height="68" rx="2" fill="#FECDD3" />
        <Rect x="8"  y="26" width="70" height="5" rx="2" fill="#FECDD3" />
        <Rect x="8"  y="48" width="70" height="5" rx="2" fill="#FECDD3" />
      </G>

      {/* Buildings */}
      <Rect x="13" y="10" width="12" height="14" rx="2" fill="#FECDD3" opacity="0.9" />
      <Rect x="14" y="9"  width="3"  height="3"  rx="1" fill="#FDA4AF" />
      <Rect x="37" y="32" width="9"  height="11" rx="2" fill="#FECDD3" opacity="0.9" />
      <Rect x="58" y="12" width="14" height="10" rx="2" fill="#FECDD3" opacity="0.9" />
      <Rect x="59" y="11" width="3"  height="3"  rx="1" fill="#FDA4AF" />
      <Rect x="13" y="54" width="8"  height="14" rx="2" fill="#FECDD3" opacity="0.9" />
      <Rect x="58" y="54" width="16" height="14" rx="2" fill="#FECDD3" opacity="0.9" />

      {/* Green parking pins */}
      <G>
        {/* Pin 1 */}
        <Circle cx="47" cy="22" r="6" fill="#10B981" />
        <Path d="M47 17 Q47 22 47 28" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
        <Circle cx="47" cy="22" r="2.5" fill="#FFFFFF" />

        {/* Pin 2 */}
        <Circle cx="22" cy="42" r="5" fill="#F59E0B" />
        <Circle cx="22" cy="42" r="2" fill="#FFFFFF" />
      </G>

      {/* Card border */}
      <Rect x="8" y="6" width="70" height="68" rx="12" fill="none" stroke={primaryColor} strokeWidth="1.5" strokeOpacity="0.3" />

      {/* ── Magnifying glass ─────────────────────────── */}
      {/* Shadow */}
      <Ellipse cx="65" cy="56" rx="18" ry="5" fill="#000" opacity="0.07" />

      {/* Lens ring */}
      <Circle cx="62" cy="50" r="22" fill={primaryColor} opacity="0.12" />
      <Circle cx="62" cy="50" r="20" fill="url(#lens)" stroke={primaryColor} strokeWidth="2.5" />

      {/* Shine */}
      <Circle cx="55" cy="43" r="6" fill="#FFFFFF" opacity="0.55" />

      {/* Handle */}
      <Path
        d="M77 65 L90 78"
        stroke="url(#handle)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Circle cx="90" cy="78" r="3.5" fill={primaryColor} />

      {/* P letter on lens */}
      <Circle cx="62" cy="50" r="9" fill={primaryColor} opacity="0.9" />
      <Path
        d="M59 45 L59 55 M59 45 L63 45 Q67 45 67 49 Q67 53 63 53 L59 53"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default MagnifyingGlassSvg;
