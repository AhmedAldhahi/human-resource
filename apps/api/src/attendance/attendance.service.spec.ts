import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { WorkLocation, EmployeeType, AttendanceStatus } from '@hrms/shared';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      attendance: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('clockIn', () => {
    it('should throw error if intendedTask is too short', async () => {
      await expect(
        service.clockIn('emp-1', 'short task'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user is already clocked in', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue({ id: 'att-1' });

      await expect(
        service.clockIn('emp-1', 'Valid intended task that is long enough'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create clocked-in attendance record successfully', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'emp-1',
        tsUsername: 'john.doe',
        employeeType: EmployeeType.FIXED,
      });

      const now = new Date();
      prismaMock.attendance.create.mockResolvedValue({
        id: 'att-2',
        employeeId: 'emp-1',
        clockInTime: now,
        clockOutTime: null,
        intendedTask: 'Valid intended task that is long enough',
        status: AttendanceStatus.CLOCKED_IN,
        workLocation: WorkLocation.OFFICE,
        latePenalty: false,
        penaltyMinutes: 0,
        completedTasksCount: null,
        clockOutNote: null,
        authorizationName: null,
        isException: false,
        exceptionStatus: null,
        employee: { name: 'John Doe', email: 'john@example.com' },
      });

      const result = await service.clockIn(
        'emp-1',
        'Valid intended task that is long enough',
        WorkLocation.OFFICE,
      );

      expect(result.id).toEqual('att-2');
      expect(result.employeeName).toEqual('John Doe');
      expect(result.status).toEqual(AttendanceStatus.CLOCKED_IN);
    });
  });
});
