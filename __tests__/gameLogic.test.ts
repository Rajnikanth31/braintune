import { GAME_REGISTRY } from '../src/games/GameRegistry';
import { DB } from '../src/storage/db';

const mockStorage = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => Promise.resolve(mockStorage.get(key) || null)),
  setItem: jest.fn((key, value) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockStorage.clear();
    return Promise.resolve();
  }),
}));

describe('Braintune Game Registry & Data Layer', () => {
  test('Game registry contains all 4 mini-games', () => {
    expect(GAME_REGISTRY.length).toBe(4);
    
    const gameIds = GAME_REGISTRY.map(g => g.id);
    expect(gameIds).toContain('memory');
    expect(gameIds).toContain('letters');
    expect(gameIds).toContain('numbers');
    expect(gameIds).toContain('colors');
  });

  test('Game registry items have correct properties', () => {
    GAME_REGISTRY.forEach(game => {
      expect(game).toHaveProperty('id');
      expect(game).toHaveProperty('name');
      expect(game).toHaveProperty('description');
      expect(game).toHaveProperty('themeColor');
      expect(game).toHaveProperty('iconName');
      expect(game).toHaveProperty('minAge');
    });
  });

  test('Database profiles can be created and loaded', async () => {
    const initialProfiles = await DB.getProfiles();
    expect(initialProfiles).toEqual([]);

    const profile = await DB.addProfile('Emma', '🦊');
    expect(profile.name).toBe('Emma');
    expect(profile.avatar).toBe('🦊');
    expect(profile.stars).toBe(0);
    expect(profile.completedSessions).toBe(0);

    const updatedProfiles = await DB.getProfiles();
    expect(updatedProfiles.length).toBe(1);
    expect(updatedProfiles[0].name).toBe('Emma');
  });

  test('Database active profile management', async () => {
    await DB.setActiveProfileId('test_id_123');
    const activeId = await DB.getActiveProfileId();
    expect(activeId).toBe('test_id_123');

    await DB.setActiveProfileId(null);
    const clearedId = await DB.getActiveProfileId();
    expect(clearedId).toBeNull();
  });
});
