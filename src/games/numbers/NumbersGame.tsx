import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../../theme/colors';
import { Mascot } from '../../components/Mascot';

interface NumbersGameProps {
  onBack: () => void;
}

export const NumbersGame: React.FC<NumbersGameProps> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>◀ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Numbers & Counting</Text>
      </View>

      <View style={styles.content}>
        <Mascot expression="thinking" message="Let's count together soon!" size={120} />
        
        <View style={styles.scaffoldCard}>
          <Text style={styles.scaffoldTitle}>Mini-Game Scaffolding</Text>
          <Text style={styles.scaffoldDescription}>
            This module is reserved for Numbers & Counting. Here children will count magical items, match numbers to quantities, and sort sequences!
          </Text>
          <View style={styles.iconPlaceholder}>
            <Text style={styles.largeNumber}>1</Text>
            <Text style={styles.largeNumber}>2</Text>
            <Text style={styles.largeNumber}>3</Text>
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
    backgroundColor: COLORS.numbers,
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
    borderColor: COLORS.numbers,
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
    justifyContent: 'center',
    gap: 16,
  },
  largeNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.numbers,
    backgroundColor: COLORS.background,
    width: 60,
    height: 60,
    textAlign: 'center',
    lineHeight: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.numbers,
  },
});
