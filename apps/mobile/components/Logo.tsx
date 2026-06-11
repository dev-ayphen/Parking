import React from 'react';
import Svg, { Path, Circle, Text, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View } from 'react-native';

interface LogoProps {
  size?: number;
  variant?: 'full' | 'icon' | 'text'; // full = logo + text, icon = just logo, text = just text
}

/**
 * ParkSwift Logo Component
 *
 * Design Elements:
 * - Banana shape (yellow) represents the app's distinctive brand
 * - P symbol integrated into banana (parking)
 * - Swift arrow showing speed/movement
 * - Professional gradient for modern look
 */
export const ParkSwiftLogo: React.FC<LogoProps> = ({ size = 200, variant = 'full' }) => {
  const logoSize = size;
  const viewBoxSize = 200;
  const scale = logoSize / viewBoxSize;

  if (variant === 'text') {
    return (
      <Svg width={logoSize} height={logoSize * 0.4} viewBox="0 0 200 80">
        <Defs>
          <LinearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFA500" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* "ParkSwift" Text */}
        <Text
          x="100"
          y="55"
          fontSize="48"
          fontWeight="800"
          textAnchor="middle"
          fill="url(#textGradient)"
          fontFamily="System"
        >
          ParkSwift
        </Text>
      </Svg>
    );
  }

  if (variant === 'icon') {
    return (
      <Svg width={logoSize} height={logoSize} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="bananaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
            <Stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Background Circle */}
        <Circle cx="100" cy="100" r="95" fill="#FFFFFF" stroke="#FFA500" strokeWidth="2" />

        {/* Banana Shape */}
        <Path
          d="M 60 80 Q 70 40, 100 35 Q 130 30, 140 80 Q 145 110, 130 135 Q 110 150, 80 145 Q 55 140, 50 110 Z"
          fill="url(#bananaGradient)"
          stroke="#FF8C00"
          strokeWidth="2"
        />

        {/* Banana Highlight */}
        <Path
          d="M 65 75 Q 72 50, 95 45"
          stroke="#FFFF99"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* P Symbol (Parking) - Integrated into banana */}
        <G>
          <Circle cx="100" cy="95" r="25" fill="rgba(255,255,255,0.9)" />
          <Path
            d="M 92 80 L 92 110 M 92 90 L 105 90 Q 110 90, 110 95 Q 110 100, 105 100 L 92 100"
            stroke="#FF8C00"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* Swift Arrow */}
        <G>
          <Path
            d="M 130 50 L 150 45 L 145 55"
            fill="#FF6B35"
            stroke="#FF6B35"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <Path
            d="M 125 55 Q 135 50, 150 45"
            stroke="#FF6B35"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </G>
      </Svg>
    );
  }

  // Full variant (logo + text)
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Logo Icon */}
      <Svg width={logoSize * 0.7} height={logoSize * 0.7} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="bananaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
            <Stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Background Circle */}
        <Circle cx="100" cy="100" r="95" fill="#FFFFFF" stroke="#FFA500" strokeWidth="2" />

        {/* Banana Shape */}
        <Path
          d="M 60 80 Q 70 40, 100 35 Q 130 30, 140 80 Q 145 110, 130 135 Q 110 150, 80 145 Q 55 140, 50 110 Z"
          fill="url(#bananaGradient)"
          stroke="#FF8C00"
          strokeWidth="2"
        />

        {/* Banana Highlight */}
        <Path
          d="M 65 75 Q 72 50, 95 45"
          stroke="#FFFF99"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* P Symbol */}
        <G>
          <Circle cx="100" cy="95" r="25" fill="rgba(255,255,255,0.9)" />
          <Path
            d="M 92 80 L 92 110 M 92 90 L 105 90 Q 110 90, 110 95 Q 110 100, 105 100 L 92 100"
            stroke="#FF8C00"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* Swift Arrow */}
        <G>
          <Path
            d="M 130 50 L 150 45 L 145 55"
            fill="#FF6B35"
            stroke="#FF6B35"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <Path
            d="M 125 55 Q 135 50, 150 45"
            stroke="#FF6B35"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Text Below Logo */}
      <Svg width={logoSize * 0.8} height={logoSize * 0.3} viewBox="0 0 200 80">
        <Defs>
          <LinearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFA500" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Text
          x="100"
          y="55"
          fontSize="42"
          fontWeight="800"
          textAnchor="middle"
          fill="url(#textGradient)"
          fontFamily="System"
        >
          ParkSwift
        </Text>
      </Svg>
    </View>
  );
};

/**
 * Logo Color Palette
 * Use these colors throughout the app for consistency
 */
export const ParkSwiftColors = {
  primary: {
    light: '#FFD700',      // Banana yellow
    main: '#FFA500',       // Orange
    dark: '#FF8C00',       // Dark orange
  },
  secondary: {
    accent: '#FF6B35',     // Swift arrow red
  },
  neutral: {
    white: '#FFFFFF',
    light: '#F5F5F5',
    medium: '#CCCCCC',
    dark: '#333333',
  },
  status: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#FFA500',
    info: '#3B82F6',
  },
};

export default ParkSwiftLogo;