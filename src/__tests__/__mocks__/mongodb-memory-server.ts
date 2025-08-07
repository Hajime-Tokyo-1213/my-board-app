export class MongoMemoryServer {
  private uri: string = 'mongodb://localhost:27017/test';
  
  static async create() {
    return new MongoMemoryServer();
  }
  
  getUri() {
    return this.uri;
  }
  
  async stop() {
    // Mock implementation
  }
}