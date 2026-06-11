import React from 'react';
import Svg, {
  G,
  Rect,
  Circle,
  Path,
  Line,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface NoSessionsSvgProps {
  width?: number;
  height?: number;
  primaryColor?: string;
  accentColor?: string;
}

const NoSessionsSvg: React.FC<NoSessionsSvgProps> = ({
  width = 120,
  height = 100,
  primaryColor = '#DC0159',
  accentColor = '#E0E7FF',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 160">
      <Defs>
        <LinearGradient id="noSessionsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.2" />
        </LinearGradient>
      </Defs>

      {/* Background circle */}
      <Circle
        cx="100"
        cy="80"
        r="70"
        fill="url(#noSessionsGrad)"
        opacity="0.5"
      />

      {/* Car silhouette */}
      <G>
        {/* Car body */}
        <Rect
          x="45"
          y="70"
          width="110"
          height="35"
          rx="8"
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.5"
        />

        {/* Car windshield */}
        <Path
          d="M 65 70 L 80 55 L 120 55 L 135 70"
          fill="none"
          stroke={primaryColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left wheel */}
        <Circle cx="70" cy="108" r="8" fill="none" stroke={primaryColor} strokeWidth="2.5" />
        <Circle cx="70" cy="108" r="4" fill="none" stroke={primaryColor} strokeWidth="1.5" />

        {/* Right wheel */}
        <Circle cx="130" cy="108" r="8" fill="none" stroke={primaryColor} strokeWidth="2.5" />
        <Circle cx="130" cy="108" r="4" fill="none" stroke={primaryColor} strokeWidth="1.5" />

        {/* Windows */}
        <Rect
          x="55"
          y="75"
          width="18"
          height="12"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1.5"
          opacity="0.6"
        />
        <Rect
          x="127"
          y="75"
          width="18"
          height="12"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Empty indicator - sleeping Z's */}
        <G>
          {/* Z line 1 */}
          <Line
            x1="100"
            y1="35"
            x2="115"
            y2="35"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <Line
            x1="115"
            y1="35"
            x2="100"
            y2="45"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <Line
            x1="100"
            y1="45"
            x2="115"
            y2="45"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </G>
      </G>

      {/* Subtle sparkles */}
      <G opacity="0.5">
        {/* Top sparkle */}
        <Circle cx="160" cy="30" r="1.5" fill={primaryColor} />
        <Line x1="160" y1="27" x2="160" y2="33" stroke={primaryColor} strokeWidth="1" />
        <Line x1="157" y1="30" x2="163" y2="30" stroke={primaryColor} strokeWidth="1" />
      </G>
    </Svg>
  );
};

export default NoSessionsSvg;
