import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Easing } from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';

export type MascotExpression = 'happy' | 'thinking' | 'neutral' | 'cheering';

interface MascotProps {
  expression?: MascotExpression;
  message?: string;
  size?: number;
}

export const Mascot: React.FC<MascotProps> = ({
  expression = 'neutral',
  message,
  size = 100,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Breathing/floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  useEffect(() => {
    // Cheering animation scale jump
    if (expression === 'cheering') {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [expression, scaleAnim]);

  // Expression-based mouth and eye rendering
  const renderFace = () => {
    switch (expression) {
      case 'happy':
        return (
          <View style={styles.face}>
            <View style={styles.eyesRow}>
              {/* Happy squinty eyes ^ ^ */}
              <View style={styles.happyEyeLeft} />
              <View style={styles.happyEyeRight} />
            </View>
            <View style={styles.happyMouth} />
          </View>
        );
      case 'cheering':
        return (
          <View style={styles.face}>
            <View style={styles.eyesRow}>
              {/* Wide open eyes */}
              <View style={styles.openEye}>
                <View style={styles.pupil} />
              </View>
              <View style={styles.openEye}>
                <View style={styles.pupil} />
              </View>
            </View>
            <View style={styles.cheeringMouth} />
          </View>
        );
      case 'thinking':
        return (
          <View style={styles.face}>
            <View style={styles.eyesRow}>
              {/* One squinty eye, one neutral */}
              <View style={styles.thinkingEyeLeft} />
              <View style={styles.neutralEye} />
            </View>
            <View style={styles.thinkingMouth} />
          </View>
        );
      case 'neutral':
      default:
        return (
          <View style={styles.face}>
            <View style={styles.eyesRow}>
              {/* Normal round eyes */}
              <View style={styles.neutralEye}>
                <View style={styles.pupil} />
              </View>
              <View style={styles.neutralEye}>
                <View style={styles.pupil} />
              </View>
            </View>
            <View style={styles.neutralMouth} />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {message ? (
        <Animated.View
          style={[
            styles.bubble,
            { transform: [{ translateY: floatAnim }] },
          ]}
        >
          <Text style={styles.bubbleText}>{message}</Text>
          <View style={styles.bubbleArrow} />
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.mascotBody,
          {
            width: size,
            height: size * 0.9,
            borderRadius: size / 2,
            transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Cute Brain mascot lobes (background details) */}
        <View style={[styles.lobeLeft, { width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25 }]} />
        <View style={[styles.lobeRight, { width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25 }]} />
        <View style={styles.mascotCore}>
          {renderFace()}
        </View>
        {/* Blush cheeks */}
        <View style={styles.cheeksRow}>
          <View style={styles.blush} />
          <View style={styles.blush} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  // Speech bubble
  bubble: {
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 14,
    maxWidth: 240,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: COLORS.primary,
  },
  // Mascot Body
  mascotBody: {
    backgroundColor: '#FFB7D5', // Cute pastel pink brain color
    borderWidth: 3,
    borderColor: '#F882B5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...SHADOWS.medium,
  },
  lobeLeft: {
    position: 'absolute',
    left: -8,
    top: 5,
    backgroundColor: '#FFB7D5',
    borderWidth: 3,
    borderColor: '#F882B5',
  },
  lobeRight: {
    position: 'absolute',
    right: -8,
    top: 5,
    backgroundColor: '#FFB7D5',
    borderWidth: 3,
    borderColor: '#F882B5',
  },
  mascotCore: {
    zIndex: 2,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    height: '70%',
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 8,
  },
  // Eye variations
  neutralEye: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2D3748',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pupil: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    position: 'absolute',
    top: 2,
    left: 2,
  },
  openEye: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2D3748',
    justifyContent: 'center',
    alignItems: 'center',
  },
  happyEyeLeft: {
    width: 14,
    height: 8,
    borderTopWidth: 3,
    borderColor: '#2D3748',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  happyEyeRight: {
    width: 14,
    height: 8,
    borderTopWidth: 3,
    borderColor: '#2D3748',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  thinkingEyeLeft: {
    width: 14,
    height: 3,
    backgroundColor: '#2D3748',
    marginTop: 6,
  },
  // Mouth variations
  neutralMouth: {
    width: 20,
    height: 5,
    backgroundColor: '#2D3748',
    borderRadius: 3,
    marginTop: 4,
  },
  happyMouth: {
    width: 18,
    height: 9,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2D3748',
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
  cheeringMouth: {
    width: 16,
    height: 12,
    backgroundColor: '#2D3748',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  thinkingMouth: {
    width: 12,
    height: 4,
    borderTopWidth: 2,
    borderColor: '#2D3748',
    transform: [{ rotate: '-8deg' }],
  },
  // Cheeks
  cheeksRow: {
    position: 'absolute',
    bottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '74%',
    zIndex: 1,
  },
  blush: {
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(248, 130, 181, 0.6)',
  },
});
