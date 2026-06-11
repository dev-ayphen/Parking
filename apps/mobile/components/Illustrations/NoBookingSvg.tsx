import React from 'react';
import Svg, {
  G,
  Rect,
  Circle,
  Path,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface NoBookingSvgProps {
  width?: number;
  height?: number;
  primaryColor?: string;
  accentColor?: string;
}

const NoBookingSvg: React.FC<NoBookingSvgProps> = ({
  width = 120,
  height = 100,
  primaryColor = '#DC0159',
  accentColor = '#E0E7FF',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 160">
      <Defs>
        <LinearGradient id="noBookingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.2" />
        </LinearGradient>
      </Defs>

      {/* Background circle */}
      <Circle
        cx="100"
        cy="80"
        r="70"
        fill="url(#noBookingGrad)"
        opacity="0.5"
      />

      {/* Calendar */}
      <G>
        {/* Calendar body */}
        <Rect
          x="50"
          y="45"
          width="100"
          height="80"
          rx="6"
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.5"
        />

        {/* Calendar header (date area) */}
        <Rect
          x="50"
          y="45"
          width="100"
          height="25"
          rx="6"
          fill={primaryColor}
          opacity="0.1"
        />

        {/* Calendar grid lines */}
        <Line
          x1="50"
          y1="70"
          x2="150"
          y2="70"
          stroke={primaryColor}
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Date boxes */}
        <Line
          x1="78"
          y1="70"
          x2="78"
          y2="100"
          stroke={primaryColor}
          strokeWidth="1"
          opacity="0.3"
        />
        <Line
          x1="106"
          y1="70"
          x2="106"
          y2="100"
          stroke={primaryColor}
          strokeWidth="1"
          opacity="0.3"
        />
        <Line
          x1="134"
          y1="70"
          x2="134"
          y2="100"
          stroke={primaryColor}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Horizontal grid */}
        <Line
          x1="50"
          y1="85"
          x2="150"
          y2="85"
          stroke={primaryColor}
          strokeWidth="1"
          opacity="0.3"
        />
        <Line
          x1="50"
          y1="100"
          x2="150"
          y2="100"
          stroke={primaryColor}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Calendar days - small numbers */}
        <Circle cx="64" cy="77" r="2" fill={primaryColor} opacity="0.6" />
        <Circle cx="92" cy="77" r="2" fill={primaryColor} opacity="0.6" />
        <Circle cx="120" cy="77" r="2" fill={primaryColor} opacity="0.6" />

        {/* Empty look - X mark in center */}
        <G>
          <Line
            x1="95"
            y1="110"
            x2="105"
            y2="120"
            stroke={primaryColor}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <Line
            x1="105"
            y1="110"
            x2="95"
            y2="120"
            stroke={primaryColor}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
        </G>
      </G>

      {/* Subtle sparkles */}
      <G opacity="0.5">
        {/* Top right sparkle */}
        <Circle cx="160" cy="40" r="2" fill={primaryColor} />
        <Line x1="160" y1="36" x2="160" y2="44" stroke={primaryColor} strokeWidth="1.2" />
        <Line x1="156" y1="40" x2="164" y2="40" stroke={primaryColor} strokeWidth="1.2" />
      </G>
    </Svg>
  );
};

export default NoBookingSvg;
