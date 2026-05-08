const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const mockOf = jest.fn().mockReturnValue({ to: mockTo, emit: mockEmit });

jest.mock('../../src/sockets/io', () => ({
  getIO: () => ({ of: mockOf }),
}));

module.exports = { mockEmit, mockTo, mockOf };
