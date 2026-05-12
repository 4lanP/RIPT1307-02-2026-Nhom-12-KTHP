const jwt = require('jsonwebtoken');
const {
  generateTokens,
  generateSessionToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifySessionToken,
} = require('../src/utils/jwt.util');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

describe('JWT Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generateTokens should call sign and return access and refresh tokens', () => {
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
      
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    const tokens = generateTokens({ id: 1 });
    expect(jwt.sign).toHaveBeenNthCalledWith(1, { id: 1 }, 'access-secret', { expiresIn: '15m' });
    expect(jwt.sign).toHaveBeenNthCalledWith(2, { id: 1 }, 'refresh-secret', { expiresIn: '7d' });
    expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
  });

  it('generateSessionToken should call sign with session payload', () => {
    jwt.sign.mockReturnValue('session-token');
    process.env.JWT_ACCESS_SECRET = 'secret';

    const token = generateSessionToken(123);
    expect(jwt.sign).toHaveBeenCalledWith({ session_id: 123, type: 'session' }, 'secret', { expiresIn: '24h' });
    expect(token).toBe('session-token');
  });

  it('verifyAccessToken should verify with secret and return payload', () => {
    jwt.verify.mockReturnValue({ valid: true });
    process.env.JWT_ACCESS_SECRET = 'secret';

    const payload = verifyAccessToken('token');
    expect(jwt.verify).toHaveBeenCalledWith('token', 'secret');
    expect(payload).toEqual({ valid: true });
  });

  it('verifyAccessToken should return null on error', () => {
    jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
    const payload = verifyAccessToken('token');
    expect(payload).toBeNull();
  });

  it('verifyRefreshToken should verify with refresh secret', () => {
    jwt.verify.mockReturnValue({ valid: true });
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';

    const payload = verifyRefreshToken('token');
    expect(jwt.verify).toHaveBeenCalledWith('token', 'refresh-secret');
    expect(payload).toEqual({ valid: true });
  });

  it('verifyRefreshToken should return null on error', () => {
    jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
    const payload = verifyRefreshToken('token');
    expect(payload).toBeNull();
  });

  it('verifySessionToken should return payload if type is session', () => {
    jwt.verify.mockReturnValue({ type: 'session', session_id: 123 });
    process.env.JWT_ACCESS_SECRET = 'secret';

    const payload = verifySessionToken('token');
    expect(jwt.verify).toHaveBeenCalledWith('token', 'secret');
    expect(payload).toEqual({ type: 'session', session_id: 123 });
  });

  it('verifySessionToken should return null if type is not session', () => {
    jwt.verify.mockReturnValue({ type: 'user', id: 123 });
    process.env.JWT_ACCESS_SECRET = 'secret';

    const payload = verifySessionToken('token');
    expect(payload).toBeNull();
  });

  it('verifySessionToken should return null on error', () => {
    jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
    const payload = verifySessionToken('token');
    expect(payload).toBeNull();
  });
});
