const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: jest.fn(),
};

beforeEach(() => {
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  mockPool.connect.mockReset();
  mockPool.query.mockReset();

  // Default response shape for DB calls that a test does not explicitly mock.
  mockPool.connect.mockResolvedValue(mockClient);
  mockClient.query.mockResolvedValue({ rows: [] });
  mockPool.query.mockResolvedValue({ rows: [] });
});

jest.mock('../../src/config/db', () => mockPool);

module.exports = { mockClient, mockPool };
