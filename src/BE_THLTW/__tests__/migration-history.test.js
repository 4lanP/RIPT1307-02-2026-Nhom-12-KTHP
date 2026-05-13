const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Migration history', () => {
  it('keeps split initial migrations as no-ops', () => {
    const part1 = read('src/BE_THLTW/migrations/1715000000000_initial-schema-part1.js');
    const part2 = read('src/BE_THLTW/migrations/1715000000001_initial-schema-part2.js');

    expect(part1).toContain('Superseded by 1715000000000_initial-schema.js');
    expect(part2).toContain('Superseded by 1715000000000_initial-schema.js');
    expect(part1).not.toContain('pgm.createTable');
    expect(part2).not.toContain('pgm.createTable');
  });

  it('enforces unique VNPay transaction IDs in migration and schema artifacts', () => {
    const initial = read('src/BE_THLTW/migrations/1715000000000_initial-schema.js');
    const indexes = read('src/BE_THLTW/migrations/1715000000002_add-indexes.js');
    const schema = read('src/BE_THLTW/src/config/schema.sql');

    expect(initial).toContain("transaction_id: { type: 'varchar(100)', unique: true }");
    expect(indexes).toContain('unique: true');
    expect(indexes).toContain("where: 'transaction_id IS NOT NULL'");
    expect(schema).toContain('transaction_id VARCHAR(100) UNIQUE');
  });
});
