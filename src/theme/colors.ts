export const COLORS = {
  background: '#F7F9FC', // Soft off-white blue
  cardBackground: '#FFFFFF',
  text: '#2D3748', // Dark slate instead of solid black
  textMuted: '#718096', // Gentle grey
  border: '#E2E8F0',
  
  // Soft, child-friendly primary actions and UI accents
  primary: '#5D9CEC', // Soft sky blue
  secondary: '#FC6E51', // Soft coral/orange
  success: '#A0D468', // Soft green
  warning: '#FFCE54', // Soft warm yellow
  accent: '#AC92EC', // Soft lavender/purple
  
  // Specific pastel theme colors for game types/rewards
  starYellow: '#FFD700',
  starEmpty: '#CBD5E0',
  correctGreen: '#E2F9E1',
  incorrectRed: '#FEE2E2',
  
  // Game theme overrides
  memory: '#AC92EC', // Lavender
  letters: '#5D9CEC', // Blue
  numbers: '#FC6E51', // Coral
  colors: '#A0D468', // Green
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};
