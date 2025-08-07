import dbConnect from '@/lib/mongodb';

// Mock mongoose entirely
jest.mock('mongoose', () => require('../../../__mocks__/mongoose'));

describe('MongoDB Connection (Simple)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('connects successfully with valid URI', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    
    await expect(dbConnect()).resolves.not.toThrow();
  });

  it('throws error when MONGODB_URI is not defined', async () => {
    delete process.env.MONGODB_URI;
    
    await expect(dbConnect()).rejects.toThrow('Please define the MONGODB_URI environment variable inside .env.local');
  });

  it('throws error when MONGODB_URI is empty', async () => {
    process.env.MONGODB_URI = '';
    
    await expect(dbConnect()).rejects.toThrow('Please define the MONGODB_URI environment variable inside .env.local');
  });

  it('does not reconnect when already connected', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    const mongoose = require('mongoose');
    
    // Simulate already connected state
    mongoose.connection.readyState = 1;
    
    await dbConnect();
    
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it('logs connection in development mode', async () => {
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await dbConnect();
    
    expect(consoleLogSpy).toHaveBeenCalledWith('MongoDB connected successfully');
    
    consoleLogSpy.mockRestore();
  });
});