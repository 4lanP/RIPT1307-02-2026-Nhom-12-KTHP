require('./helpers/mockDb');

const { mockPool } = require('./helpers/mockDb');
const sessionService = require('../src/services/session.service');

function lastQuery() {
  const [query, params] = mockPool.query.mock.calls[mockPool.query.mock.calls.length - 1];
  return { query, params };
}

describe('Staff table contract', () => {
  it('returns canonical table fields while preserving legacy aliases', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          table_id: 1,
          table_name: 'Bàn 01',
          status: 'AVAILABLE',
          zone: 'Tầng 1',
          capacity: '4',
          active_session_id: null,
        },
        {
          id: 2,
          name: 'Bàn 02',
          status: 'OCCUPIED',
          zone: 'Sân vườn',
          capacity: 6,
          active_session_id: 35,
        },
      ],
    });

    const result = await sessionService.getTables();

    expect(result).toEqual([
      {
        id: 1,
        name: 'Bàn 01',
        table_id: 1,
        table_name: 'Bàn 01',
        status: 'AVAILABLE',
        zone: 'Tầng 1',
        capacity: 4,
        active_session_id: null,
      },
      {
        id: 2,
        name: 'Bàn 02',
        table_id: 2,
        table_name: 'Bàn 02',
        status: 'OCCUPIED',
        zone: 'Sân vườn',
        capacity: 6,
        active_session_id: 35,
      },
    ]);
  });

  it('queries canonical and compatibility aliases for staff table consumers', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await sessionService.getTables();

    const { query, params } = lastQuery();
    expect(params).toBeUndefined();
    expect(query).toMatch(/t\.id\s+as\s+id/i);
    expect(query).toMatch(/t\.name\s+as\s+name/i);
    expect(query).toMatch(/t\.id\s+as\s+table_id/i);
    expect(query).toMatch(/t\.name\s+as\s+table_name/i);
    expect(query).toMatch(/LEFT JOIN\s+SESSIONS\s+s/i);
    expect(query).toMatch(/s\.status\s*=\s*'ACTIVE'/i);
  });

  it('only returns open customer requests for active sessions', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 11,
          session_id: 35,
          request_type: 'REQUEST_BILL',
          status: 'OPEN',
          table_id: 1,
          table_name: 'Bàn 01',
        },
      ],
    });

    const result = await sessionService.getRequests();

    expect(result).toHaveLength(1);
    const { query, params } = lastQuery();
    expect(params).toBeUndefined();
    expect(query).toMatch(/JOIN\s+SESSIONS\s+s\s+ON\s+s\.id\s*=\s*cr\.session_id/i);
    expect(query).toMatch(/cr\.status\s*=\s*'OPEN'/i);
    expect(query).toMatch(/s\.status\s*=\s*'ACTIVE'/i);
  });
});
