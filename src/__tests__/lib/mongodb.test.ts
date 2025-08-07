import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

// Mock mongoose
jest.mock('mongoose', () => ({
  connection: {
    readyState: 0,
  },
  connect: jest.fn(),
}));

describe('MongoDB Connection', () => {
  const mockMongoose = mongoose as jest.Mocked<typeof mongoose>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    Object.keys(originalEnv).forEach(key => {
      process.env[key] = originalEnv[key];
    });
    // Reset connection state
    (mockMongoose.connection as any).readyState = 0;
  });

  afterEach(() => {
    Object.keys(originalEnv).forEach(key => {
      process.env[key] = originalEnv[key];
    });
  });

  it('connects to MongoDB when not already connected', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    mockMongoose.connect.mockResolvedValueOnce(mockMongoose as any);

    await dbConnect();

    expect(mockMongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect when already connected', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    // Set connection state to connected
    (mockMongoose.connection as any).readyState = 1;

    await dbConnect();

    expect(mockMongoose.connect).not.toHaveBeenCalled();
  });

  it('does not reconnect when connecting', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    // Set connection state to connecting
    (mockMongoose.connection as any).readyState = 2;

    await dbConnect();

    expect(mockMongoose.connect).not.toHaveBeenCalled();
  });

  it('throws error when MONGODB_URI is not set', async () => {
    delete process.env.MONGODB_URI;

    await expect(dbConnect()).rejects.toThrow('Please define the MONGODB_URI environment variable');
  });

  it('throws error when MONGODB_URI is empty', async () => {
    process.env.MONGODB_URI = '';

    await expect(dbConnect()).rejects.toThrow('Please define the MONGODB_URI environment variable');
  });

  it('handles connection errors', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    const connectionError = new Error('Connection failed');
    mockMongoose.connect.mockRejectedValueOnce(connectionError);

    await expect(dbConnect()).rejects.toThrow('Connection failed');
  });

  it('logs successful connection in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    mockMongoose.connect.mockResolvedValueOnce(mockMongoose as any);

    await dbConnect();

    expect(consoleLogSpy).toHaveBeenCalledWith('MongoDB connected successfully');
    consoleLogSpy.mockRestore();
  });

  it('does not log in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    mockMongoose.connect.mockResolvedValueOnce(mockMongoose as any);

    await dbConnect();

    expect(consoleLogSpy).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it('handles various connection states correctly', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    
    // Test all connection states
    const states = [
      { state: 0, name: 'disconnected', shouldConnect: true },
      { state: 1, name: 'connected', shouldConnect: false },
      { state: 2, name: 'connecting', shouldConnect: false },
      { state: 3, name: 'disconnecting', shouldConnect: true },
    ];

    for (const { state, name, shouldConnect } of states) {
      jest.clearAllMocks();
      (mockMongoose.connection as any).readyState = state;
      mockMongoose.connect.mockResolvedValueOnce(mockMongoose as any);

      await dbConnect();

      if (shouldConnect) {
        expect(mockMongoose.connect).toHaveBeenCalled();
      } else {
        expect(mockMongoose.connect).not.toHaveBeenCalled();
      }
    }
  });

  it('uses connection options correctly', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test?retryWrites=true';
    mockMongoose.connect.mockResolvedValueOnce(mockMongoose as any);

    await dbConnect();

    expect(mockMongoose.connect).toHaveBeenCalledWith(
      'mongodb://localhost:27017/test?retryWrites=true'
    );
  });
});