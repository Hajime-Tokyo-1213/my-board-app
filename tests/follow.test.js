import mongoose from 'mongoose';
import User from '../models/User.js';
import Follow from '../src/models/Follow';
import connectDB from '../lib/mongodb';

const TEST_USERS = {
  userA: {
    email: 'user.a@test.com',
    password: 'Password123!',
    name: 'User A',
    username: 'usera',
  },
  userB: {
    email: 'user.b@test.com',
    password: 'Password123!',
    name: 'User B',
    username: 'userb',
  },
  userC: {
    email: 'user.c@test.com',
    password: 'Password123!',
    name: 'User C',
    username: 'userc',
  },
};

describe('Follow Functionality Tests', () => {
  let userA, userB, userC;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Follow.deleteMany({});

    // Create test users
    userA = await User.create(TEST_USERS.userA);
    userB = await User.create(TEST_USERS.userB);
    userC = await User.create(TEST_USERS.userC);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Follow.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Follow User', () => {
    test('User A should successfully follow User B', async () => {
      const result = await userA.followUser(userB._id);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully followed user');
      expect(result.followingCount).toBe(1);
      expect(result.targetFollowersCount).toBe(1);

      // Verify database state
      const updatedUserA = await User.findById(userA._id);
      const updatedUserB = await User.findById(userB._id);

      expect(updatedUserA.followingCount).toBe(1);
      expect(updatedUserA.following).toContainEqual(userB._id);
      expect(updatedUserB.followersCount).toBe(1);
      expect(updatedUserB.followers).toContainEqual(userA._id);
    });

    test('Should prevent self-following', async () => {
      await expect(userA.followUser(userA._id)).rejects.toThrow(
        'Users cannot follow themselves'
      );

      const updatedUserA = await User.findById(userA._id);
      expect(updatedUserA.followingCount).toBe(0);
      expect(updatedUserA.followersCount).toBe(0);
    });

    test('Should prevent duplicate follows', async () => {
      // First follow should succeed
      await userA.followUser(userB._id);

      // Second follow should fail
      await expect(userA.followUser(userB._id)).rejects.toThrow(
        'Already following this user'
      );

      // Verify counts didn't increase
      const updatedUserA = await User.findById(userA._id);
      const updatedUserB = await User.findById(userB._id);

      expect(updatedUserA.followingCount).toBe(1);
      expect(updatedUserB.followersCount).toBe(1);
    });

    test('Multiple users can follow the same user', async () => {
      await userA.followUser(userC._id);
      await userB.followUser(userC._id);

      const updatedUserC = await User.findById(userC._id);
      expect(updatedUserC.followersCount).toBe(2);
      expect(updatedUserC.followers).toContainEqual(userA._id);
      expect(updatedUserC.followers).toContainEqual(userB._id);
    });
  });

  describe('Unfollow User', () => {
    beforeEach(async () => {
      // Setup: User A follows User B
      await userA.followUser(userB._id);
    });

    test('User A should successfully unfollow User B', async () => {
      const result = await userA.unfollowUser(userB._id);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully unfollowed user');
      expect(result.followingCount).toBe(0);
      expect(result.targetFollowersCount).toBe(0);

      // Verify database state
      const updatedUserA = await User.findById(userA._id);
      const updatedUserB = await User.findById(userB._id);

      expect(updatedUserA.followingCount).toBe(0);
      expect(updatedUserA.following).not.toContainEqual(userB._id);
      expect(updatedUserB.followersCount).toBe(0);
      expect(updatedUserB.followers).not.toContainEqual(userA._id);
    });

    test('Should throw error when unfollowing non-followed user', async () => {
      await expect(userA.unfollowUser(userC._id)).rejects.toThrow(
        'Not following this user'
      );
    });

    test('Should handle unfollow correctly with multiple followers', async () => {
      // User C also follows User B
      await userC.followUser(userB._id);

      // User A unfollows User B
      await userA.unfollowUser(userB._id);

      const updatedUserB = await User.findById(userB._id);
      expect(updatedUserB.followersCount).toBe(1);
      expect(updatedUserB.followers).toContainEqual(userC._id);
      expect(updatedUserB.followers).not.toContainEqual(userA._id);
    });
  });

  describe('Follow Relationships', () => {
    test('Should correctly identify follow relationships', async () => {
      await userA.followUser(userB._id);
      await userB.followUser(userA._id);

      const relationshipFromA = await userA.getFollowRelationship(userB._id);
      expect(relationshipFromA.isFollowing).toBe(true);
      expect(relationshipFromA.isFollowedBy).toBe(true);
      expect(relationshipFromA.isMutual).toBe(true);

      const relationshipFromB = await userB.getFollowRelationship(userA._id);
      expect(relationshipFromB.isFollowing).toBe(true);
      expect(relationshipFromB.isFollowedBy).toBe(true);
      expect(relationshipFromB.isMutual).toBe(true);
    });

    test('Should correctly identify one-way relationships', async () => {
      await userA.followUser(userB._id);

      const relationshipFromA = await userA.getFollowRelationship(userB._id);
      expect(relationshipFromA.isFollowing).toBe(true);
      expect(relationshipFromA.isFollowedBy).toBe(false);
      expect(relationshipFromA.isMutual).toBe(false);

      const relationshipFromB = await userB.getFollowRelationship(userA._id);
      expect(relationshipFromB.isFollowing).toBe(false);
      expect(relationshipFromB.isFollowedBy).toBe(true);
      expect(relationshipFromB.isMutual).toBe(false);
    });
  });

  describe('Counter Management', () => {
    test('Counters should update correctly on follow/unfollow', async () => {
      // Initial state
      expect(userA.followingCount).toBe(0);
      expect(userB.followersCount).toBe(0);

      // After follow
      await userA.followUser(userB._id);
      const afterFollowA = await User.findById(userA._id);
      const afterFollowB = await User.findById(userB._id);
      expect(afterFollowA.followingCount).toBe(1);
      expect(afterFollowB.followersCount).toBe(1);

      // After unfollow
      await afterFollowA.unfollowUser(userB._id);
      const afterUnfollowA = await User.findById(userA._id);
      const afterUnfollowB = await User.findById(userB._id);
      expect(afterUnfollowA.followingCount).toBe(0);
      expect(afterUnfollowB.followersCount).toBe(0);
    });

    test('Counters should handle multiple follows correctly', async () => {
      await userA.followUser(userB._id);
      await userA.followUser(userC._id);

      const updatedUserA = await User.findById(userA._id);
      expect(updatedUserA.followingCount).toBe(2);

      await userB.followUser(userA._id);
      await userC.followUser(userA._id);

      const finalUserA = await User.findById(userA._id);
      expect(finalUserA.followersCount).toBe(2);
      expect(finalUserA.followingCount).toBe(2);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Setup complex follow relationships
      await userA.followUser(userB._id);
      await userA.followUser(userC._id);
      await userB.followUser(userA._id);
      await userC.followUser(userA._id);
      await userB.followUser(userC._id);
    });

    test('Should get followers list with pagination', async () => {
      const result = await User.getFollowers(userA._id, { page: 1, limit: 10 });

      expect(result.followers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    test('Should get following list with pagination', async () => {
      const result = await User.getFollowing(userA._id, { page: 1, limit: 10 });

      expect(result.following).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    test('Should get mutual followers', async () => {
      const mutuals = await User.getMutualFollowers(userA._id, userC._id);
      
      // User B follows both User A and User C
      expect(mutuals).toHaveLength(1);
      expect(mutuals[0]._id).toEqual(userB._id);
    });

    test('Should get suggested users', async () => {
      const suggestions = await User.getSuggestedUsers(userB._id);
      
      // User B follows A and C, so no suggestions from those
      // But should still return users if any exist
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});