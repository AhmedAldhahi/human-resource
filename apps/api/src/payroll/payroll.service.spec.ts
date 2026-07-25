import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { EmployeeType, PayrollStatus } from '@hrms/shared';

describe('PayrollService', () => {
  let service: PayrollService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findMany: jest.fn(),
      },
      payrollRecord: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDraftPayroll', () => {
    it('should throw BadRequestException if month format is invalid', async () => {
      await expect(service.getDraftPayroll('invalid-month')).rejects.toThrow(BadRequestException);
    });

    it('should calculate draft payroll for active users', async () => {
      const clockIn = new Date('2026-07-01T09:00:00Z');
      const clockOut = new Date('2026-07-01T17:00:00Z');

      prismaMock.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          name: 'Jane Smith',
          email: 'jane@example.com',
          employeeType: EmployeeType.FIXED,
          monthlySalary: 5000,
          hourlyWage: 0,
          transportationAllowance: 500,
          recurringBonus: 200,
          attendances: [
            {
              clockInTime: clockIn,
              clockOutTime: clockOut,
              workLocation: 'OFFICE',
              isException: false,
            },
          ],
          receivedCards: [],
          payrollRecords: [],
        },
      ]);

      const result = await service.getDraftPayroll('2026-07');
      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Jane Smith');
      expect(result[0].trackedHours).toEqual(8);
    });
  });
});
