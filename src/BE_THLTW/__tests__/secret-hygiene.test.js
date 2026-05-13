const { findTrackedEnvFiles, readRepoFile } = require('./helpers/secretScan');

describe('Secret hygiene', () => {
  it('does not track local env files', () => {
    expect(findTrackedEnvFiles()).toEqual([]);
  });

  it('keeps backend env example as placeholders only', () => {
    const example = readRepoFile('src/BE_THLTW/.env.example');

    expect(example).toContain('JWT_ACCESS_SECRET=<jwt-access-secret-min-32-chars>');
    expect(example).toContain('JWT_REFRESH_SECRET=<jwt-refresh-secret-min-32-chars>');
    expect(example).toContain('VNPAY_HASHSECRET=<vnpay-hash-secret>');
    expect(example).not.toContain('strongpassword123');
    expect(example).not.toContain('your_super_secret');
  });

  it('documents credential rotation categories', () => {
    const deploymentDoc = readRepoFile('docs/05-deployment.md');

    expect(deploymentDoc).toContain('Credential Rotation');
    expect(deploymentDoc).toContain('JWT');
    expect(deploymentDoc).toContain('Database');
    expect(deploymentDoc).toContain('VNPay');
    expect(deploymentDoc).toContain('Redis');
  });
});
