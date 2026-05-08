const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: Trả về object có properties cơ bản
  mockClient.query.mockResolvedValue({ rows: [] });
  mockPool.query.mockResolvedValue({ rows: [] });
});

jest.mock('../../src/config/db', () => mockPool);

module.exports = { mockClient, mockPool };
