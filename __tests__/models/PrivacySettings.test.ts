import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '@/models/User';
import { IPrivacySettings, defaultPrivacySettings } from '@/models/PrivacySettings';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('PrivacySettings Model', () => {
  describe('Default Settings', () => {
    it('should create user with default privacy settings', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(user.privacySettings).toBeDefined();
      expect(user.privacySettings.isPrivate).toBe(false);
      expect(user.privacySettings.defaultPostVisibility).toBe('public');
      expect(user.privacySettings.allowComments).toBe('everyone');
      expect(user.privacySettings.requireFollowApproval).toBe(false);
    });

    it('should have all notification settings enabled by default', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(user.privacySettings.notifications.likes).toBe(true);
      expect(user.privacySettings.notifications.comments).toBe(true);
      expect(user.privacySettings.notifications.follows).toBe(true);
      expect(user.privacySettings.notifications.mentions).toBe(true);
    });
  });

  describe('Private Account Settings', () => {
    it('should update to private account', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      user.privacySettings.isPrivate = true;
      user.privacySettings.requireFollowApproval = true;
      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.privacySettings.isPrivate).toBe(true);
      expect(updatedUser?.privacySettings.requireFollowApproval).toBe(true);
    });

    it('should enforce follow approval for private accounts', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        privacySettings: {
          ...defaultPrivacySettings,
          isPrivate: true,
          requireFollowApproval: true,
        },
      });

      expect(user.privacySettings.isPrivate).toBe(true);
      expect(user.privacySettings.requireFollowApproval).toBe(true);
    });
  });

  describe('Post Visibility Settings', () => {
    it('should set default post visibility', async () => {
      const visibilityOptions: Array<'public' | 'followers' | 'mutual' | 'private'> = 
        ['public', 'followers', 'mutual', 'private'];

      for (const visibility of visibilityOptions) {
        const user = await User.create({
          email: `test-${visibility}@example.com`,
          password: 'password123',
          name: 'Test User',
          privacySettings: {
            ...defaultPrivacySettings,
            defaultPostVisibility: visibility,
          },
        });

        expect(user.privacySettings.defaultPostVisibility).toBe(visibility);
      }
    });
  });

  describe('Interaction Permissions', () => {
    it('should control comment permissions', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        privacySettings: {
          ...defaultPrivacySettings,
          allowComments: 'followers',
        },
      });

      expect(user.privacySettings.allowComments).toBe('followers');
    });

    it('should control like permissions', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        privacySettings: {
          ...defaultPrivacySettings,
          allowLikes: 'mutual',
        },
      });

      expect(user.privacySettings.allowLikes).toBe('mutual');
    });

    it('should control share permissions', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        privacySettings: {
          ...defaultPrivacySettings,
          allowShares: 'none',
        },
      });

      expect(user.privacySettings.allowShares).toBe('none');
    });
  });

  describe('Profile Display Settings', () => {
    it('should control profile information visibility', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        privacySettings: {
          ...defaultPrivacySettings,
          showFollowerCount: false,
          showFollowingCount: false,
          showPostCount: false,
          showJoinDate: false,
        },
      });

      expect(user.privacySettings.showFollowerCount).toBe(false);
      expect(user.privacySettings.showFollowingCount).toBe(false);
      expect(user.privacySettings.showPostCount).toBe(false);
      expect(user.privacySettings.showJoinDate).toBe(false);
    });
  });

  describe('Notification Settings', () => {
    it('should disable specific notifications', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        privacySettings: {
          ...defaultPrivacySettings,
          notifications: {
            ...defaultPrivacySettings.notifications,
            likes: false,
            shares: false,
          },
        },
      });

      expect(user.privacySettings.notifications.likes).toBe(false);
      expect(user.privacySettings.notifications.shares).toBe(false);
      expect(user.privacySettings.notifications.comments).toBe(true);
    });
  });
});