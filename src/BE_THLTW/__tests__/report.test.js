require('./helpers/mockDb');
const { mockPool } = require('./helpers/mockDb');
const reportService = require('../src/services/report.service');
const ExcelJS = require('exceljs');

// Mock ExcelJS
jest.mock('exceljs');

describe('Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRevenueReport', () => {
    it('should return revenue report data', async () => {
      const mockData = [{ period: '2023-10-01', method: 'CASH', total_amount: 100 }];
      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await reportService.getRevenueReport('2023-10-01', '2023-10-31', 'day');
      expect(result).toEqual(mockData);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['day', '2023-10-01', '2023-10-31']);
    });

    it('should default groupBy to day if invalid', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await reportService.getRevenueReport('2023-10-01', '2023-10-31', 'invalid');
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['day', '2023-10-01', '2023-10-31']);
    });
  });

  describe('getMenuReport', () => {
    it('should return menu report data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ name: 'Item 1', total_sold: 5 }] });
      const result = await reportService.getMenuReport();
      expect(result).toEqual([{ name: 'Item 1', total_sold: 5 }]);
    });
  });

  describe('getKdsReport', () => {
    it('should return kds report data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ order_id: 1, minutes_to_ready: 10 }] });
      const result = await reportService.getKdsReport();
      expect(result).toEqual([{ order_id: 1, minutes_to_ready: 10 }]);
    });
  });

  describe('generateExcelReport', () => {
    it('should generate excel report and write to response', async () => {
      const mockWrite = jest.fn().mockResolvedValue(true);
      const mockAddRows = jest.fn();
      const mockAddWorksheet = jest.fn().mockReturnValue({ columns: [], addRows: mockAddRows });
      
      ExcelJS.Workbook.mockImplementation(() => ({
        addWorksheet: mockAddWorksheet,
        xlsx: { write: mockWrite }
      }));

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn()
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, method: 'CASH' }] }) // Payments
        .mockResolvedValueOnce({ rows: [{ id: 1, table_id: 1 }] }); // Sessions

      await reportService.generateExcelReport(mockRes);

      expect(mockAddWorksheet).toHaveBeenCalledTimes(2);
      expect(mockAddRows).toHaveBeenCalledTimes(2);
      expect(mockRes.setHeader).toHaveBeenCalledTimes(2);
      expect(mockWrite).toHaveBeenCalledWith(mockRes);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('resetMenuQuota', () => {
    it('should reset menu quota', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await reportService.resetMenuQuota();
      expect(result).toEqual({ success: true });
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
