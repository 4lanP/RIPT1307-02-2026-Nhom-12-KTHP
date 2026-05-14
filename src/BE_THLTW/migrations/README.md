# Database Migrations

This directory contains database migrations managed by `node-pg-migrate`.

## Quick Start

```bash
# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create a new migration
npm run migrate:create my-migration-name
```

## Migration Files

Migrations are executed in order based on their timestamp prefix:

1. `1715000000000_initial-schema.js` - Canonical initial schema for enums, core tables, orders, sessions, and payments
2. `1715000000000_initial-schema-part1.js` - Historical split migration kept as a no-op for stable migration history
3. `1715000000001_initial-schema-part2.js` - Historical split migration kept as a no-op for stable migration history
4. `1715000000002_add-indexes.js` - Adds performance indexes and unique payment transaction reference protection

## Creating New Migrations

```bash
# Create a new migration file
npm run migrate:create add-audit-columns

# This creates: migrations/[timestamp]_add-audit-columns.js
```

Example migration structure:

```javascript
exports.up = (pgm) => {
  pgm.addColumn('USERS', {
    updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('USERS', 'updated_at');
};
```

## Best Practices

1. **Always provide `down` migration** - Enables rollback
2. **Test migrations locally first** - Run up/down cycle
3. **One logical change per migration** - Easier to debug
4. **Use transactions** - Migrations are wrapped in transactions by default
5. **Backup before production** - Always backup before running migrations

## Common Commands

```bash
# Check migration status
npm run migrate -- list

# Run specific number of migrations
npm run migrate -- up 2

# Rollback specific number of migrations
npm run migrate -- down 2

# Redo last migration (down then up)
npm run migrate -- redo
```

## Environment Variables

Migrations use `DATABASE_URL` from `.env`:

```env
DATABASE_URL=postgres://user:pass@localhost:5432/restaurant_dbs
```

## Troubleshooting

### Migration fails midway
```bash
# Check which migrations ran
npm run migrate -- list

# Manually fix database if needed
psql $DATABASE_URL

# Then retry
npm run migrate:up
```

### Need to skip a migration
```bash
# Mark migration as run without executing
npm run migrate -- up [migration-name] --fake
```

### Reset database (DANGER)
```bash
# This will drop all tables and re-run migrations
npm run migrate -- down 0
npm run migrate:up
```

## Migration Table

Migrations are tracked in the `pgmigrations` table:

```sql
SELECT * FROM pgmigrations ORDER BY run_on DESC;
```

## Production Deployment

1. Backup database
2. Run migrations in maintenance window
3. Verify with `npm run migrate -- list`
4. Deploy application code
5. Monitor logs

```bash
# Production migration command
NODE_ENV=production npm run migrate:up
```
