#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Import models
import User from '../models/User.js';
import Follow from '../src/models/Follow.js';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'cyan');
  console.log('='.repeat(50));
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log('✓ Connected to MongoDB', 'green');
  } catch (error) {
    log('✗ Failed to connect to MongoDB', 'red');
    console.error(error);
    process.exit(1);
  }
}

async function cleanupTestData() {
  logSection('Cleaning up test data');
  
  const testEmails = ['test.a@example.com', 'test.b@example.com', 'test.c@example.com'];
  
  try {
    const result = await User.deleteMany({ 
      email: { $in: testEmails } 
    });
    log(`✓ Deleted ${result.deletedCount} test users`, 'green');
  } catch (error) {
    log('✗ Failed to cleanup test data', 'red');
    console.error(error);
  }
}

async function createTestUsers() {
  logSection('Creating test users');
  
  const users = [
    {
      email: 'test.a@example.com',
      password: 'TestPassword123!',
      name: 'Test User A',
      username: 'testusera',
      bio: 'I am test user A',
    },
    {
      email: 'test.b@example.com',
      password: 'TestPassword123!',
      name: 'Test User B',
      username: 'testuserb',
      bio: 'I am test user B',
    },
    {
      email: 'test.c@example.com',
      password: 'TestPassword123!',
      name: 'Test User C',
      username: 'testuserc',
      bio: 'I am test user C',
    },
  ];

  const createdUsers = [];
  
  for (const userData of users) {
    try {
      const user = await User.create(userData);
      createdUsers.push(user);
      log(`✓ Created user: ${user.name} (${user.email})`, 'green');
    } catch (error) {
      log(`✗ Failed to create user: ${userData.email}`, 'red');
      console.error(error.message);
    }
  }
  
  return createdUsers;
}

async function testFollowFunctionality(userA, userB, userC) {
  logSection('Testing Follow Functionality');
  
  // Test 1: User A follows User B
  log('\nTest 1: User A follows User B', 'yellow');
  try {
    const result = await userA.followUser(userB._id);
    log(`✓ Follow successful: ${result.message}`, 'green');
    log(`  User A following count: ${result.followingCount}`, 'blue');
    log(`  User B followers count: ${result.targetFollowersCount}`, 'blue');
  } catch (error) {
    log(`✗ Follow failed: ${error.message}`, 'red');
  }

  // Test 2: Check counts after follow
  log('\nTest 2: Verify counts after follow', 'yellow');
  const updatedUserA = await User.findById(userA._id);
  const updatedUserB = await User.findById(userB._id);
  
  log(`  User A:`, 'blue');
  log(`    Following: ${updatedUserA.followingCount}`, 'blue');
  log(`    Followers: ${updatedUserA.followersCount}`, 'blue');
  log(`  User B:`, 'blue');
  log(`    Following: ${updatedUserB.followingCount}`, 'blue');
  log(`    Followers: ${updatedUserB.followersCount}`, 'blue');
  
  if (updatedUserA.followingCount === 1 && updatedUserB.followersCount === 1) {
    log('✓ Counts are correct', 'green');
  } else {
    log('✗ Counts are incorrect', 'red');
  }

  // Test 3: Prevent duplicate follow
  log('\nTest 3: Prevent duplicate follow', 'yellow');
  try {
    await updatedUserA.followUser(userB._id);
    log('✗ Duplicate follow was not prevented!', 'red');
  } catch (error) {
    log(`✓ Duplicate follow prevented: ${error.message}`, 'green');
  }

  // Test 4: Prevent self-follow
  log('\nTest 4: Prevent self-follow', 'yellow');
  try {
    await updatedUserA.followUser(userA._id);
    log('✗ Self-follow was not prevented!', 'red');
  } catch (error) {
    log(`✓ Self-follow prevented: ${error.message}`, 'green');
  }

  // Test 5: Multiple users following
  log('\nTest 5: Multiple users following', 'yellow');
  try {
    await userC.followUser(userB._id);
    const userBAfterC = await User.findById(userB._id);
    log(`✓ User C followed User B`, 'green');
    log(`  User B now has ${userBAfterC.followersCount} followers`, 'blue');
  } catch (error) {
    log(`✗ User C failed to follow User B: ${error.message}`, 'red');
  }

  // Test 6: Check relationship status
  log('\nTest 6: Check relationship status', 'yellow');
  const relationship = await updatedUserA.getFollowRelationship(userB._id);
  log(`  User A → User B:`, 'blue');
  log(`    Following: ${relationship.isFollowing}`, 'blue');
  log(`    Followed by: ${relationship.isFollowedBy}`, 'blue');
  log(`    Mutual: ${relationship.isMutual}`, 'blue');

  // Test 7: Mutual follow
  log('\nTest 7: Create mutual follow', 'yellow');
  try {
    await updatedUserB.followUser(userA._id);
    const mutualRelationship = await updatedUserA.getFollowRelationship(userB._id);
    log(`✓ User B followed User A back`, 'green');
    log(`  Mutual follow established: ${mutualRelationship.isMutual}`, 'blue');
  } catch (error) {
    log(`✗ Failed to create mutual follow: ${error.message}`, 'red');
  }

  // Test 8: Unfollow
  log('\nTest 8: Unfollow functionality', 'yellow');
  try {
    const unfollowResult = await updatedUserA.unfollowUser(userB._id);
    log(`✓ Unfollow successful: ${unfollowResult.message}`, 'green');
    log(`  User A following count: ${unfollowResult.followingCount}`, 'blue');
    log(`  User B followers count: ${unfollowResult.targetFollowersCount}`, 'blue');
  } catch (error) {
    log(`✗ Unfollow failed: ${error.message}`, 'red');
  }

  // Test 9: Get followers list
  log('\nTest 9: Get followers list', 'yellow');
  try {
    const followersData = await User.getFollowers(userB._id, { page: 1, limit: 10 });
    log(`✓ Retrieved followers for User B:`, 'green');
    log(`  Total followers: ${followersData.total}`, 'blue');
    log(`  Current page count: ${followersData.followers.length}`, 'blue');
    followersData.followers.forEach(follower => {
      log(`    - ${follower.name} (@${follower.username})`, 'blue');
    });
  } catch (error) {
    log(`✗ Failed to get followers: ${error.message}`, 'red');
  }

  // Test 10: Get following list
  log('\nTest 10: Get following list', 'yellow');
  try {
    await userC.followUser(userA._id);
    const followingData = await User.getFollowing(userC._id, { page: 1, limit: 10 });
    log(`✓ Retrieved following for User C:`, 'green');
    log(`  Total following: ${followingData.total}`, 'blue');
    log(`  Current page count: ${followingData.following.length}`, 'blue');
    followingData.following.forEach(user => {
      log(`    - ${user.name} (@${user.username})`, 'blue');
    });
  } catch (error) {
    log(`✗ Failed to get following: ${error.message}`, 'red');
  }
}

async function displayFinalStats(users) {
  logSection('Final Statistics');
  
  for (const user of users) {
    const refreshedUser = await User.findById(user._id);
    log(`\n${refreshedUser.name}:`, 'cyan');
    log(`  Followers: ${refreshedUser.followersCount}`, 'blue');
    log(`  Following: ${refreshedUser.followingCount}`, 'blue');
  }
}

async function runTests() {
  try {
    await connectDB();
    await cleanupTestData();
    
    const [userA, userB, userC] = await createTestUsers();
    
    if (userA && userB && userC) {
      await testFollowFunctionality(userA, userB, userC);
      await displayFinalStats([userA, userB, userC]);
    } else {
      log('Failed to create all test users', 'red');
    }
    
    await cleanupTestData();
    
    logSection('Test Complete');
    log('✓ All tests completed successfully', 'green');
    
  } catch (error) {
    log('✗ Test suite failed', 'red');
    console.error(error);
  } finally {
    await mongoose.connection.close();
    log('\n✓ Database connection closed', 'green');
    process.exit(0);
  }
}

// Run the tests
runTests();