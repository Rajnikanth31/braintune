import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../../theme/colors';
import { Mascot } from '../../components/Mascot';

interface ColorsGameProps {
  onBack: () => void;
}

export const ColorsGame: React.FC<ColorsGameProps> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>◀ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Colors & Shapes</Text>
      </View>

      <View style={styles.content}>
        <Mascot expression="thinking" message="Let's match colors soon!" size={120} />
        
        <View style={styles.scaffoldCard}>
          <Text style={styles.scaffoldTitle}>Mini-Game Scaffolding</Text>
          <Text style={styles.scaffoldDescription}>
            This module is reserved for Colors & Shapes. Here children will sort objects by color and complete interactive shape patterns!
          </Text>
          <View style={styles.iconPlaceholder}>
            <View style={[styles.shape, { backgroundColor: '#FF8A80', borderRadius: 0 }]} />
            <View style={[styles.shape, { backgroundColor: '#FFD54F', borderRadius: 20 }]} />
            <View style={[styles.shape, { borderLeftWidth: 20, borderRightWidth: 20, borderBottomWidth: 40, borderStyle: 'solid', backgroundColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#81C784', width: 0, height: 0 }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: COLORS.colors,
    ...SHADOWS.small,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginRight: 60, // Balance the back button spacing
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaffoldCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.colors,
    marginTop: 20,
    ...SHADOWS.medium,
  },
  scaffoldTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  scaffoldDescription: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  iconPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    height: 60,
  },
  shape: {
    width: 40,
    height: 40,
  },
});
