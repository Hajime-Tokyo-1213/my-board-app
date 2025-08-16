const mockPost = {
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockResolvedValue([]),
  }),
  findById: jest.fn().mockResolvedValue(null),
  findByIdAndUpdate: jest.fn().mockResolvedValue(null),
  findByIdAndDelete: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  countDocuments: jest.fn().mockResolvedValue(0),
};

export default mockPost;