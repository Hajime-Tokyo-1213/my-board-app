import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Post from '@/models/Post';

let mongoServer: MongoMemoryServer | null = null;

/**
 * Sets up an in-memory MongoDB instance for testing
 */
export async function setupTestDatabase() {
  // Disconnect from any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Create new in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(uri);

  return uri;
}

/**
 * Tears down the test database and closes connections
 */
export async function teardownTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Clears all data from the test database
 */
export async function clearTestDatabase() {
  if (mongoose.connection.readyState === 0) {
    throw new Error('No database connection');
  }

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Seeds the database with test posts
 */
export async function seedTestPosts(count: number = 5) {
  const posts = [];
  
  for (let i = 0; i < count; i++) {
    const post = await Post.create({
      content: `Test post ${i + 1} - ${Date.now()}`,
      createdAt: new Date(Date.now() - (count - i) * 60000), // Stagger creation times
      updatedAt: new Date(Date.now() - (count - i) * 60000),
    });
    posts.push(post);
  }

  return posts;
}

/**
 * Creates a single test post with custom data
 */
export async function createTestPost(data: Partial<{ content: string; createdAt: Date; updatedAt: Date }> = {}) {
  const defaultData = {
    content: `Test post - ${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const post = await Post.create({ ...defaultData, ...data });
  return post;
}

/**
 * Generates valid post content with specified characteristics
 */
export function generatePostContent(options: {
  length?: number;
  includeEmoji?: boolean;
  includeSpecialChars?: boolean;
  language?: 'en' | 'ja' | 'mixed';
} = {}) {
  const { 
    length = 50, 
    includeEmoji = false, 
    includeSpecialChars = false,
    language = 'en' 
  } = options;

  let content = '';
  
  // Base content based on language
  const templates = {
    en: 'This is a test post content ',
    ja: 'これはテスト投稿の内容です ',
    mixed: 'This is a test 投稿 content '
  };
  
  const baseContent = templates[language];
  
  // Build content to specified length
  while (content.length < length) {
    content += baseContent;
  }
  
  content = content.substring(0, length);
  
  // Add emoji if requested
  if (includeEmoji) {
    content = content.substring(0, length - 2) + ' 😀';
  }
  
  // Add special characters if requested
  if (includeSpecialChars) {
    content = content.substring(0, length - 5) + ' @#$!';
  }
  
  return content.trim();
}

/**
 * Validates post data structure
 */
export function validatePostStructure(post: any) {
  const requiredFields = ['_id', 'content', 'createdAt', 'updatedAt'];
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!(field in post)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (typeof post.content !== 'string') {
    errors.push('Content must be a string');
  }

  if (post.content.length > 200) {
    errors.push('Content exceeds 200 character limit');
  }

  if (!(post.createdAt instanceof Date) && !Date.parse(post.createdAt)) {
    errors.push('Invalid createdAt date');
  }

  if (!(post.updatedAt instanceof Date) && !Date.parse(post.updatedAt)) {
    errors.push('Invalid updatedAt date');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Test data factory for creating consistent test objects
 */
export class TestDataFactory {
  private static postIdCounter = 1;

  static createMockPost(overrides: Partial<any> = {}) {
    const id = `mock-post-${this.postIdCounter++}`;
    const now = new Date();

    return {
      _id: id,
      content: `Mock post content ${id}`,
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
  }

  static createMockPostArray(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, () => this.createMockPost(overrides));
  }

  static reset() {
    this.postIdCounter = 1;
  }
}

/**
 * Waits for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Captures console output during test execution
 */
export class ConsoleCapture {
  private originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
  };
  
  private captured: {
    logs: any[][];
    errors: any[][];
    warnings: any[][];
  };

  constructor() {
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };
    
    this.captured = {
      logs: [],
      errors: [],
      warnings: []
    };
  }

  start() {
    console.log = (...args) => {
      this.captured.logs.push(args);
    };
    
    console.error = (...args) => {
      this.captured.errors.push(args);
    };
    
    console.warn = (...args) => {
      this.captured.warnings.push(args);
    };
  }

  stop() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
  }

  getCaptured() {
    return this.captured;
  }

  clear() {
    this.captured = {
      logs: [],
      errors: [],
      warnings: []
    };
  }
}

/**
 * Performance measurement utility
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number>;

  constructor() {
    this.startTime = Date.now();
    this.marks = new Map();
  }

  mark(name: string) {
    this.marks.set(name, Date.now());
  }

  getMark(name: string): number | undefined {
    const markTime = this.marks.get(name);
    return markTime ? markTime - this.startTime : undefined;
  }

  getDuration(startMark: string, endMark: string): number | undefined {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    return start && end ? end - start : undefined;
  }

  getTotalTime(): number {
    return Date.now() - this.startTime;
  }

  reset() {
    this.startTime = Date.now();
    this.marks.clear();
  }
}