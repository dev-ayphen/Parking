import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Spacing } from '../../theme/colors';

interface Stat {
  value: string | number | React.ReactNode;
  label: string;
}

interface HomeCardPhotoProps {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  subtitle: string;
  photo: ImageSourcePropType;
  stats: Stat[];
  buttonText: string;
  buttonColor: string;
  onPressButton: () => void;
}

const HomeCardPhoto: React.FC<HomeCardPhotoProps> = ({
  icon,
  iconBgColor,
  title,
  subtitle,
  photo,
  stats,
  buttonText,
  buttonColor,
  onPressButton,
}) => {
  return (
    <View style={styles.wrapper}>
      <ImageBackground
        source={photo}
        style={styles.card}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        {/* Top fade — keeps top area slightly visible */}
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'transparent']}
          style={styles.topGrad}
          pointerEvents="none"
        />

        {/* Bottom gradient — strong dark so stats+button always readable */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.55, 1]}
          style={styles.bottomGrad}
          pointerEvents="none"
        />

        {/* ── Header — top left ── */}
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: iconBgColor }]}>
            {icon}
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {/* ── Bottom content ── */}
        <View style={styles.bottom}>

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <React.Fragment key={i}>
                <View style={styles.statItem}>
                  {typeof stat.value === 'string' || typeof stat.value === 'number' ? (
                    <Text style={styles.statValue}>{stat.value}</Text>
                  ) : (
                    <>{stat.value}</>
                  )}
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                {i < stats.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onPressButton}
            style={[styles.btn, { backgroundColor: buttonColor }]}
          >
            <Text style={styles.btnText}>{buttonText}</Text>
          </TouchableOpacity>

        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.screenH,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  image: {
    borderRadius: 20,
  },

  // ── Gradients ─────────────────────────────────────────────────────
  topGrad: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 90,
  },
  bottomGrad: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 160,
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 0,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.medium,
    marginTop: 1,
  },

  // ── Bottom section ────────────────────────────────────────────────
  bottom: {
    padding: 14,
    paddingTop: 10,
  },

  // ── Stats ─────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // ── Button ────────────────────────────────────────────────────────
  btn: {
    height: 42,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});

export default HomeCardPhoto;
