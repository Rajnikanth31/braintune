export interface MiniGameConfig {
  id: string;
  name: string;
  description: string;
  themeColor: string;
  iconName: string;
  minAge: number;
}

export const GAME_REGISTRY: MiniGameConfig[] = [
  {
    id: 'memory',
    name: 'Memory Match & Tap',
    description: 'Find matching cards and spot target items to train concentration!',
    themeColor: '#AC92EC', // Lavender
    iconName: 'brain',
    minAge: 4,
  },
  {
    id: 'letters',
    name: 'Letters & Phonics',
    description: 'Trace letters, match sounds, and unlock friendly words!',
    themeColor: '#5D9CEC', // Blue
    iconName: 'font',
    minAge: 4,
  },
  {
    id: 'numbers',
    name: 'Numbers & Counting',
    description: 'Count magical objects and sequence numbers in order!',
    themeColor: '#FC6E51', // Coral
    iconName: 'calculator',
    minAge: 4,
  },
  {
    id: 'colors',
    name: 'Colors & Shapes',
    description: 'Sort beautiful items and complete fun shape patterns!',
    themeColor: '#A0D468', // Green
    iconName: 'th-large',
    minAge: 4,
  },
];
