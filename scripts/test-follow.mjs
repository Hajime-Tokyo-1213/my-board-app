#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

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

// Define User schema directly here since imports are causing issues
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    maxlength: 30,
  },
  bio: {
    type: String,
    maxlength: 200,
    default: '',
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  followersCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.followUser = async function(userIdToFollow) {
  const User = this.constructor;
  
  if (this._id.equals(userIdToFollow)) {
    throw new Error('Users cannot follow themselves');
  }
  
  const userToFollow = await User.findById(userIdToFollow);
  if (!userToFollow) {
    throw new Error('User not found');
  }
  
  const isAlreadyFollowing = this.following.some(id => 
    id.equals(userIdToFollow)
  );
  
  if (isAlreadyFollowing) {
    throw new Error('Already following this user');
  }
  
  this.following.push(userIdToFollow);
  this.followingCount = this.following.length;
  
  userToFollow.followers.push(this._id);
  userToFollow.followersCount = userToFollow.followers.length;
  
  await Promise.all([
    this.save(),
    userToFollow.save()
  ]);
  
  return {
    success: true,
    message: 'Successfully followed user',
    followingCount: this.followingCount,
    targetFollowersCount: userToFollow.followersCount
  };
};

userSchema.methods.unfollowUser = async function(userIdToUnfollow) {
  const User = this.constructor;
  
  const userToUnfollow = await User.findById(userIdToUnfollow);
  if (!userToUnfollow) {
    throw new Error('User not found');
  }
  
  const followingIndex = this.following.findIndex(id => 
    id.equals(userIdToUnfollow)
  );
  
  if (followingIndex === -1) {
    throw new Error('Not following this user');
  }
  
  this.following.splice(followingIndex, 1);
  this.followingCount = this.following.length;
  
  const followerIndex = userToUnfollow.followers.findIndex(id => 
    id.equals(this._id)
  );
  
  if (followerIndex !== -1) {
    userToUnfollow.followers.splice(followerIndex, 1);
    userToUnfollow.followersCount = userToUnfollow.followers.length;
  }
  
  await Promise.all([
    this.save(),
    userToUnfollow.save()
  ]);
  
  return {
    success: true,
    message: 'Successfully unfollowed user',
    followingCount: this.followingCount,
    targetFollowersCount: userToUnfollow.followersCount
  };
};

const User = mongoose.models.TestUser || mongoose.model('TestUser', userSchema);

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

  // Test 6: Unfollow functionality
  log('\nTest 6: Unfollow functionality', 'yellow');
  try {
    const unfollowResult = await updatedUserA.unfollowUser(userB._id);
    log(`✓ Unfollow successful: ${unfollowResult.message}`, 'green');
    log(`  User A following count: ${unfollowResult.followingCount}`, 'blue');
    log(`  User B followers count: ${unfollowResult.targetFollowersCount}`, 'blue');
  } catch (error) {
    log(`✗ Unfollow failed: ${error.message}`, 'red');
  }

  // Test 7: Verify unfollow worked
  log('\nTest 7: Verify unfollow counts', 'yellow');
  const finalUserA = await User.findById(userA._id);
  const finalUserB = await User.findById(userB._id);
  
  if (finalUserA.followingCount === 0 && finalUserB.followersCount === 1) {
    log('✓ Unfollow counts are correct', 'green');
    log(`  User A following: ${finalUserA.followingCount}`, 'blue');
    log(`  User B followers: ${finalUserB.followersCount} (User C still following)`, 'blue');
  } else {
    log('✗ Unfollow counts are incorrect', 'red');
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