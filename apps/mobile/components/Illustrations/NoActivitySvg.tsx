import React from 'react';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface NoActivitySvgProps {
  width?: number;
  height?: number;
  primaryColor?: string;
  accentColor?: string;
}

const NoActivitySvg: React.FC<NoActivitySvgProps> = ({
  width = 120,
  height = 120,
  primaryColor = '#DC0159',
  accentColor = '#FFF5FA',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={accentColor} />
          <Stop offset="100%" stopColor="#FFE4E6" />
        </LinearGradient>
        <LinearGradient id="iconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FF006B" />
          <Stop offset="100%" stopColor={primaryColor} />
        </LinearGradient>
      </Defs>

      {/* Outer soft glowing circle */}
      <Circle cx="60" cy="60" r="50" fill="url(#bgGrad)" opacity="0.4" />
      
      {/* Radar orbit line */}
      <Circle cx="60" cy="60" r="40" fill="none" stroke={primaryColor} strokeWidth="1" strokeDasharray="3 5" opacity="0.25" />
      
      {/* Mid soft circle */}
      <Circle cx="60" cy="60" r="30" fill="url(#bgGrad)" opacity="0.7" />

      {/* White center badge */}
      <Circle cx="60" cy="60" r="20" fill="#FFFFFF" />
      <Circle cx="60" cy="60" r="20" fill="url(#iconGrad)" opacity="0.1" />
      
      {/* Clock Face & Hands */}
      <Circle cx="60" cy="60" r="12" fill="none" stroke={primaryColor} strokeWidth="2" />
      <Path 
        d="M60 53 L60 60 L65 63" 
        fill="none" 
        stroke={primaryColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Activity Wave trailing across */}
      <Path 
        d="M30 65 Q45 45 60 62 T90 55" 
        fill="none" 
        stroke="#6366F1" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        opacity="0.8" 
      />

      {/* Sparkles / Particles */}
      <Circle cx="35" cy="45" r="2" fill="#6366F1" opacity="0.6" />
      <Circle cx="85" cy="72" r="1.5" fill={primaryColor} opacity="0.7" />
      <Circle cx="80" cy="40" r="3" fill="#FBBF24" opacity="0.8" />
    </Svg>
  );
};

export default NoActivitySvg;
