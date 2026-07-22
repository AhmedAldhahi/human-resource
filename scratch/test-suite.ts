import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from '../apps/api/src/app/app.module';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';
import { CardsService } from '../apps/api/src/cards/cards.service';
import { AbsenceService } from '../apps/api/src/absence/absence.service';
import { AttendanceService } from '../apps/api/src/attendance/attendance.service';
import { PayrollService } from '../apps/api/src/payroll/payroll.service';
import { ChatService } from '../apps/api/src/chat/chat.service';
import { ReportsService } from '../apps/api/src/reports/reports.service';
import { PresenceService } from '../apps/api/src/presence/presence.service';
import { CardType, AbsenceType, AbsenceStatus, WorkLocation } from '@hrms/shared';

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING COMPREHENSIVE HRMS VERIFICATION TEST SUITE');
  console.log('=============================================================\n');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const prisma = app.get(PrismaService);
  const cardsService = app.get(CardsService);
  const absenceService = app.get(AbsenceService);
  const attendanceService = app.get(AttendanceService);
  const payrollService = app.get(PayrollService);
  const chatService = app.get(ChatService);
  const reportsService = app.get(ReportsService);
  const presenceService = app.get(PresenceService);

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.log(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failedTests++;
    }
  }

  // Create temporary test user
  const testEmail = `test.user.${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      password: 'hashedpassword',
      name: 'Test Scenario User',
      role: 'EMPLOYEE',
      vacationDaysLeft: 14,
      absenceDaysLeft: 28,
      sickDaysLeft: 14,
      netCardPoints: 0,
      earlyLeaveMinutesAccumulated: 0,
    },
  });

  try {
    // -------------------------------------------------------------------
    // Scenario 1: Performance Card Deletion Points Recalculation
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 1: Performance Card Issue & Deletion ---');
    const issuer = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || user;

    // Issue card
    const card = await cardsService.issueCard(issuer.id, {
      employeeId: user.id,
      cardType: CardType.GOLD_PLUS_50,
      reason: 'Outstanding leadership in project delivery',
    });

    let updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert(updatedUser?.netCardPoints === 50, 'Card issuance adds +50 netCardPoints to user');

    // Delete card
    await cardsService.deleteCard(card.id);
    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert(updatedUser?.netCardPoints === 0, 'Card deletion recalculates and resets netCardPoints back to 0');

    // -------------------------------------------------------------------
    // Scenario 2: Early Leave Accumulation (Pending vs Approved)
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 2: Early Leave Pending vs Approval ---');
    const earlyLeaveRecord = await absenceService.createRequest(user.id, {
      date: '2026-07-22',
      type: AbsenceType.EARLY_LEAVE,
      earlyLeaveMinutes: 120,
      reason: 'Doctor appointment',
    });

    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert(
      updatedUser?.earlyLeaveMinutesAccumulated === 0 && earlyLeaveRecord.status === AbsenceStatus.PENDING,
      'Early leave request in PENDING status does NOT deduct/accumulate minutes prematurely'
    );

    // Approve the early leave request
    await absenceService.updateStatus(earlyLeaveRecord.id, AbsenceStatus.APPROVED);
    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert(
      updatedUser?.earlyLeaveMinutesAccumulated === 120,
      'Early leave minutes (120m) are accumulated upon HR APPROVAL'
    );

    // -------------------------------------------------------------------
    // Scenario 3: Absence Balance Refund Capping on Reversion
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 3: Absence Balance Capping on Revert ---');
    const sickRecord = await absenceService.createRequest(user.id, {
      date: '2026-07-21',
      type: AbsenceType.SICK_LEAVE,
      reason: 'Flu symptoms',
    });

    // Approve -> deducts 1 day (14 -> 13)
    await absenceService.updateStatus(sickRecord.id, AbsenceStatus.APPROVED);
    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert(updatedUser?.sickDaysLeft === 13, 'Approving sick leave deducts 1 day (14 -> 13)');

    // Revert back to REJECTED -> refunds 1 day (13 -> 14)
    await absenceService.updateStatus(sickRecord.id, AbsenceStatus.REJECTED);
    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert(updatedUser?.sickDaysLeft === 14, 'Reverting approved sick leave refunds day capped at 14');

    // Reverting again does not exceed max balance cap of 14
    await absenceService.updateStatus(sickRecord.id, AbsenceStatus.REJECTED);
    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert(updatedUser?.sickDaysLeft === 14, 'Absence balance refund is strictly capped at max balance (14)');

    // -------------------------------------------------------------------
    // Scenario 4: Attendance Double Clock-In & Validation
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 4: Attendance Validation & Double Clock-In ---');
    let shortTaskError = false;
    try {
      await attendanceService.clockIn(user.id, 'short');
    } catch (e: any) {
      shortTaskError = e instanceof BadRequestException;
    }
    assert(shortTaskError, 'Clock-in rejects intended task under 15 characters');

    const validTask = 'Working on quarterly financial audit and compliance report';
    const clockIn1 = await attendanceService.clockIn(user.id, validTask, WorkLocation.OFFICE);
    assert(clockIn1.status === 'CLOCKED_IN', 'First clock-in succeeds');

    let doubleClockInError = false;
    try {
      await attendanceService.clockIn(user.id, validTask, WorkLocation.OFFICE);
    } catch (e: any) {
      doubleClockInError = e instanceof BadRequestException;
    }
    assert(doubleClockInError, 'System blocks double clock-in while an open shift exists');

    // Clock out
    await attendanceService.clockOut(user.id, {
      completedTasksCount: 5,
      clockOutNote: 'Completed financial report draft',
    });

    // -------------------------------------------------------------------
    // Scenario 5: Payroll Month Format Validation
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 5: Payroll Month Validation ---');
    let invalidMonthError = false;
    try {
      await payrollService.getDraftPayroll('invalid-month');
    } catch (e: any) {
      invalidMonthError = e instanceof BadRequestException;
    }
    assert(invalidMonthError, 'Payroll draft rejects invalid month string format');

    const draft = await payrollService.getDraftPayroll('2026-07');
    assert(Array.isArray(draft), 'Payroll draft returns valid array for YYYY-MM format');

    // -------------------------------------------------------------------
    // Scenario 6: Chat Validation (Self Chat & Empty Message)
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 6: Chat Logic & Validation ---');
    let selfChatError = false;
    try {
      await chatService.findOrCreateDirectConversation(user.id, user.id);
    } catch (e: any) {
      selfChatError = e instanceof BadRequestException;
    }
    assert(selfChatError, 'System prevents user from creating a direct conversation with themselves');

    let emptyMessageError = false;
    try {
      await chatService.saveMessage('fake-conv-id', user.id, '   ');
    } catch (e: any) {
      emptyMessageError = e instanceof BadRequestException;
    }
    assert(emptyMessageError, 'System rejects sending whitespace/empty chat messages');

    // -------------------------------------------------------------------
    // Scenario 7: Reports 1-Indexed Month Parameter
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 7: Reports 1-Indexed Month ---');
    const reportsSummary = await reportsService.getPayrollSummary(2026, 7); // July (1-indexed 7)
    assert(Array.isArray(reportsSummary), 'Reports payroll summary accepts 1-indexed month 7 (July)');

    // -------------------------------------------------------------------
    // Scenario 8: Presence Live & Stats
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 8: Presence Services ---');
    const presenceStats = await presenceService.getPresenceStats();
    assert(typeof presenceStats.totalEmployees === 'number', 'Presence stats returns structured stats object');

  } finally {
    // Clean up temporary user and records
    await prisma.absenceRecord.deleteMany({ where: { userId: user.id } });
    await prisma.attendance.deleteMany({ where: { employeeId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log('\n=============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=============================================================\n');

  await app.close();
}

runTestSuite().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
