import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Post from '@/models/Post';

describe('Post Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clear all test data after each test
    await Post.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('creates a valid post with required fields', async () => {
      const postData = {
        content: 'This is a test post',
      };

      const post = new Post(postData);
      const savedPost = await post.save();

      expect(savedPost._id).toBeDefined();
      expect(savedPost.content).toBe(postData.content);
      expect(savedPost.createdAt).toBeInstanceOf(Date);
      expect(savedPost.updatedAt).toBeInstanceOf(Date);
    });

    it('requires content field', async () => {
      const post = new Post({});

      let error: any;
      try {
        await post.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.content).toBeDefined();
      expect(error.errors.content.kind).toBe('required');
    });

    it('enforces 200 character limit', async () => {
      const longContent = 'a'.repeat(201);
      const post = new Post({ content: longContent });

      let error: any;
      try {
        await post.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.content).toBeDefined();
      expect(error.errors.content.message).toContain('200文字以内');
    });

    it('allows exactly 200 characters', async () => {
      const exactContent = 'a'.repeat(200);
      const post = new Post({ content: exactContent });
      
      const savedPost = await post.save();
      expect(savedPost.content).toBe(exactContent);
      expect(savedPost.content.length).toBe(200);
    });

    it('trims whitespace from content', async () => {
      const post = new Post({ content: '  Test content with spaces  ' });
      const savedPost = await post.save();

      expect(savedPost.content).toBe('Test content with spaces');
    });

    it('rejects empty string content', async () => {
      const post = new Post({ content: '' });

      let error: any;
      try {
        await post.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.content).toBeDefined();
    });

    it('rejects whitespace-only content', async () => {
      const post = new Post({ content: '   ' });

      let error: any;
      try {
        await post.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.content).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('automatically sets createdAt and updatedAt on creation', async () => {
      const before = new Date();
      const post = await Post.create({ content: 'Test post' });
      const after = new Date();

      expect(post.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(post.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(post.updatedAt.getTime()).toBe(post.createdAt.getTime());
    });

    it('updates updatedAt on modification', async () => {
      const post = await Post.create({ content: 'Original content' });
      const originalUpdatedAt = post.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      post.content = 'Updated content';
      await post.save();

      expect(post.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      expect(post.createdAt.getTime()).toBe(post.createdAt.getTime()); // createdAt should not change
    });
  });

  describe('Model Methods', () => {
    it('converts to JSON correctly', async () => {
      const post = await Post.create({ content: 'Test post' });
      const json = post.toJSON();

      expect(json).toHaveProperty('_id');
      expect(json).toHaveProperty('content', 'Test post');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
      expect(json).not.toHaveProperty('__v'); // Version key should be excluded
    });

    it('supports findById', async () => {
      const post = await Post.create({ content: 'Find me!' });
      const found = await Post.findById(post._id);

      expect(found).toBeDefined();
      expect(found?.content).toBe('Find me!');
    });

    it('supports findByIdAndUpdate', async () => {
      const post = await Post.create({ content: 'Original' });
      const updated = await Post.findByIdAndUpdate(
        post._id,
        { content: 'Updated' },
        { new: true, runValidators: true }
      );

      expect(updated?.content).toBe('Updated');
    });

    it('validates on update', async () => {
      const post = await Post.create({ content: 'Original' });
      
      let error: any;
      try {
        await Post.findByIdAndUpdate(
          post._id,
          { content: 'a'.repeat(201) },
          { new: true, runValidators: true }
        );
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.content).toBeDefined();
    });

    it('supports findByIdAndDelete', async () => {
      const post = await Post.create({ content: 'Delete me!' });
      const deleted = await Post.findByIdAndDelete(post._id);

      expect(deleted?.content).toBe('Delete me!');
      
      const found = await Post.findById(post._id);
      expect(found).toBeNull();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test data
      await Post.create([
        { content: 'First post' },
        { content: 'Second post' },
        { content: 'Third post' },
      ]);
    });

    it('finds all posts', async () => {
      const posts = await Post.find({});
      expect(posts).toHaveLength(3);
    });

    it('sorts posts by createdAt', async () => {
      const posts = await Post.find({}).sort({ createdAt: -1 });
      
      expect(posts[0].content).toBe('Third post');
      expect(posts[2].content).toBe('First post');
    });

    it('limits query results', async () => {
      const posts = await Post.find({}).limit(2);
      expect(posts).toHaveLength(2);
    });

    it('counts documents', async () => {
      const count = await Post.countDocuments({});
      expect(count).toBe(3);
    });

    it('supports text search', async () => {
      const posts = await Post.find({ content: /Second/ });
      expect(posts).toHaveLength(1);
      expect(posts[0].content).toBe('Second post');
    });
  });

  describe('Special Characters and Edge Cases', () => {
    it('handles unicode characters correctly', async () => {
      const unicodeContent = 'Hello 世界 🌍 مرحبا мир';
      const post = await Post.create({ content: unicodeContent });
      
      expect(post.content).toBe(unicodeContent);
      
      const found = await Post.findById(post._id);
      expect(found?.content).toBe(unicodeContent);
    });

    it('handles special HTML characters', async () => {
      const htmlContent = '<script>alert("test")</script> & "quotes" \'single\'';
      const post = await Post.create({ content: htmlContent });
      
      expect(post.content).toBe(htmlContent);
    });

    it('handles line breaks and tabs', async () => {
      const content = 'Line 1\nLine 2\tTabbed';
      const post = await Post.create({ content });
      
      expect(post.content).toBe(content);
    });
  });

  describe('Performance', () => {
    it('handles bulk operations efficiently', async () => {
      const posts = Array.from({ length: 100 }, (_, i) => ({
        content: `Bulk post ${i}`,
      }));

      const startTime = Date.now();
      await Post.insertMany(posts);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      const count = await Post.countDocuments({});
      expect(count).toBe(100);
    });
  });
});