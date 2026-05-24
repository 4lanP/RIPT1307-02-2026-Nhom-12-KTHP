require('./helpers/mockDb');

const { mockPool } = require('./helpers/mockDb');
const reportService = require('../src/services/report.service');

function lastQuery() {
  const [query, params] = mockPool.query.mock.calls[mockPool.query.mock.calls.length - 1];
  return { query, params };
}

describe('Admin report data sync', () => {
  describe('getRevenueReport', () => {
    it('returns revenue rows with the frontend report contract fields', async () => {
      const rows = [
        {
          date: new Date('2026-05-24T00:00:00.000Z'),
          method: 'CASH',
          total: '450000',
          order_count: '9',
        },
      ];
      mockPool.query.mockResolvedValueOnce({ rows });

      const result = await reportService.getRevenueReport('2026-05-01', '2026-05-24', 'day');

      expect(result).toEqual(rows);
      expect(result[0]).toEqual(
        expect.objectContaining({
          date: expect.any(Date),
          method: 'CASH',
          total: '450000',
          order_count: '9',
        })
      );
      expect(result[0]).not.toHaveProperty('period');
      expect(result[0]).not.toHaveProperty('total_amount');
    });

    it('queries completed payments by inclusive date range, grouping, and frontend aliases', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await reportService.getRevenueReport('2026-05-01', '2026-05-24', 'week');

      const { query, params } = lastQuery();
      expect(params).toEqual(['week', '2026-05-01', '2026-05-24']);
      expect(query).toMatch(/DATE_TRUNC\(\$1,\s*paid_at\)\s+as\s+date/i);
      expect(query).toMatch(/SUM\(amount\)\s+as\s+total/i);
      expect(query).toMatch(/COUNT\(id\)\s+as\s+order_count/i);
      expect(query).toMatch(/FROM\s+PAYMENTS/i);
      expect(query).toMatch(/status\s*=\s*'COMPLETED'/i);
      expect(query).toMatch(/paid_at\s*>=\s*\$2/i);
      expect(query).toMatch(/paid_at\s*<=\s*\$3/i);
      expect(query).toMatch(/GROUP BY\s+1,\s*method/i);
      expect(query).toMatch(/ORDER BY\s+1/i);
    });

    it('falls back to day grouping for unsupported service-level group values', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await reportService.getRevenueReport('2026-05-01', '2026-05-24', 'quarter');

      const { params } = lastQuery();
      expect(params).toEqual(['day', '2026-05-01', '2026-05-24']);
    });

    it('returns an empty revenue collection without remapping fields', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await reportService.getRevenueReport('2026-05-01', '2026-05-24', 'month');

      expect(result).toEqual([]);
    });
  });

  describe('getMenuReport', () => {
    it('returns menu rows with the frontend report contract fields', async () => {
      const rows = [
        { name: 'Ca phe sua da', total_quantity: '32' },
        { name: 'Banh mi', total_quantity: '18' },
      ];
      mockPool.query.mockResolvedValueOnce({ rows });

      const result = await reportService.getMenuReport();

      expect(result).toEqual(rows);
      expect(result[0]).toEqual(
        expect.objectContaining({
          name: 'Ca phe sua da',
          total_quantity: '32',
        })
      );
      expect(result[0]).not.toHaveProperty('total_sold');
    });

    it('queries served order item quantities ordered by top-20 quantity ranking', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await reportService.getMenuReport();

      const { query, params } = lastQuery();
      expect(params).toBeUndefined();
      expect(query).toMatch(/SELECT\s+mi\.name,\s*SUM\(oi\.quantity\)\s+as\s+total_quantity/i);
      expect(query).toMatch(/FROM\s+ORDER_ITEMS\s+oi/i);
      expect(query).toMatch(/JOIN\s+MENU_ITEMS\s+mi\s+ON\s+mi\.id\s*=\s*oi\.menu_item_id/i);
      expect(query).toMatch(/oi\.status\s*=\s*'SERVED'/i);
      expect(query).toMatch(/GROUP BY\s+mi\.id,\s*mi\.name/i);
      expect(query).toMatch(/ORDER BY\s+total_quantity\s+DESC/i);
      expect(query).toMatch(/LIMIT\s+20/i);
    });

    it('returns an empty menu collection without remapping fields', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await reportService.getMenuReport();

      expect(result).toEqual([]);
    });
  });
});
