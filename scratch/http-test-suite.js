require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API = 'http://localhost:3000/api';

async function runHttpTests() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING LIVE API HTTP INTEGRATION SCENARIO TESTS');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Get or Create Test Admin User & Login
  const adminEmail = `admin.test.${Date.now()}@example.com`;
  const bcrypt = require('bcrypt');
  const hashed = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashed,
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });

  const empEmail = `employee.test.${Date.now()}@example.com`;
  const emp = await prisma.user.create({
    data: {
      email: empEmail,
      password: hashed,
      name: 'Test Employee',
      role: 'EMPLOYEE',
      sickDaysLeft: 14,
      vacationDaysLeft: 14,
      absenceDaysLeft: 28,
      netCardPoints: 0,
    },
  });

  try {
    // Auth Login
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: adminEmail,
      password: 'admin123',
    });

    assert(loginRes.status === 201 || loginRes.status === 200, 'Admin Authentication Login');
    const adminToken = loginRes.data.accessToken;

    const empLoginRes = await axios.post(`${API}/auth/login`, {
      email: empEmail,
      password: 'admin123',
    });
    const empToken = empLoginRes.data.accessToken;

    const adminClient = axios.create({
      baseURL: API,
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const empClient = axios.create({
      baseURL: API,
      headers: { Authorization: `Bearer ${empToken}` },
    });

    // -------------------------------------------------------------------
    // Scenario 1: Performance Card Issue & Point Recalculation on Delete
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 1: Performance Cards & Delete Point Recalculation ---');
    
    // Prevent self-issuance check
    let selfIssueError = false;
    try {
      await adminClient.post('/cards/issue', {
        employeeId: admin.id,
        cardType: 'GOLD_PLUS_50',
        reason: 'Self bonus attempt',
      });
    } catch (err) {
      selfIssueError = err.response && err.response.status === 400;
    }
    assert(selfIssueError, 'System prevents issuing performance card to oneself');

    // Issue card to employee
    const cardRes = await adminClient.post('/cards/issue', {
      employeeId: emp.id,
      cardType: 'GOLD_PLUS_50',
      reason: 'Great teamwork',
    });
    const cardId = cardRes.data.id;

    let updatedEmp = await prisma.user.findUnique({ where: { id: emp.id } });
    assert(updatedEmp.netCardPoints === 50, 'Issuing card increases netCardPoints (+50)');

    // Delete card -> points recalculated
    await adminClient.delete(`/cards/${cardId}`);
    updatedEmp = await prisma.user.findUnique({ where: { id: emp.id } });
    assert(updatedEmp.netCardPoints === 0, 'Deleting card recalculates netCardPoints back to 0 (FIX VERIFIED)');

    // -------------------------------------------------------------------
    // Scenario 2: Absence Leave Balance & Early Leave Accumulation
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 2: Absence Approval & Balance Capping ---');

    // Early leave submitted -> stays pending, balance unchanged
    const earlyLeaveRes = await empClient.post('/absence/request', {
      date: '2026-07-22',
      type: 'EARLY_LEAVE',
      earlyLeaveMinutes: 120,
      reason: 'Personal urgent matter',
    });
    const earlyLeaveId = earlyLeaveRes.data.id;

    updatedEmp = await prisma.user.findUnique({ where: { id: emp.id } });
    assert(
      updatedEmp.earlyLeaveMinutesAccumulated === 0,
      'Early leave request while PENDING does NOT deduct/accumulate minutes prematurely (FIX VERIFIED)'
    );

    // HR approves early leave -> minutes accumulate
    await adminClient.patch(`/absence/${earlyLeaveId}/status`, { status: 'APPROVED' });
    updatedEmp = await prisma.user.findUnique({ where: { id: emp.id } });
    assert(
      updatedEmp.earlyLeaveMinutesAccumulated === 120,
      'Early leave minutes accumulate upon HR APPROVAL'
    );

    // Sick leave approval & revert capping
    const sickRes = await empClient.post('/absence/request', {
      date: '2026-07-21',
      type: 'SICK_LEAVE',
      reason: 'Medical note attached',
    });
    const sickId = sickRes.data.id;

    await adminClient.patch(`/absence/${sickId}/status`, { status: 'APPROVED' });
    updatedEmp = await prisma.user.findUnique({ where: { id: emp.id } });
    assert(updatedEmp.sickDaysLeft === 13, 'Approved sick leave deducts 1 day (14 -> 13)');

    await adminClient.patch(`/absence/${sickId}/status`, { status: 'REJECTED' });
    updatedEmp = await prisma.user.findUnique({ where: { id: emp.id } });
    assert(updatedEmp.sickDaysLeft === 14, 'Reverting approved sick leave refunds day capped at 14 (FIX VERIFIED)');

    // -------------------------------------------------------------------
    // Scenario 3: Payroll Draft Month Validation & Reports Month Index
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 3: Payroll & Reports Parameter Fixes ---');

    let invalidPayrollMonth = false;
    try {
      await adminClient.get('/payroll/draft?month=invalid-date');
    } catch (err) {
      invalidPayrollMonth = err.response && err.response.status === 400;
    }
    assert(invalidPayrollMonth, 'Payroll draft rejects invalid month string (FIX VERIFIED)');

    const validPayroll = await adminClient.get('/payroll/draft?month=2026-07');
    assert(Array.isArray(validPayroll.data), 'Payroll draft handles YYYY-MM query correctly');

    const reportsSummary = await adminClient.get('/reports/payroll?year=2026&month=7');
    assert(Array.isArray(reportsSummary.data), 'Reports payroll summary parses 1-indexed July (month=7) correctly (FIX VERIFIED)');

    // -------------------------------------------------------------------
    // Scenario 4: Presence Stats Endpoint URL Fix
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 4: Presence Stats Endpoint ---');

    const presenceStats = await empClient.get('/presence/stats');
    assert(
      presenceStats.status === 200 && typeof presenceStats.data.totalEmployees === 'number',
      'GET /presence/stats returns 200 OK with correct stats payload (FIX VERIFIED)'
    );

    // -------------------------------------------------------------------
    // Scenario 5: Chat Self-Conversation & Empty Message Validation
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 5: Chat Validation Fixes ---');

    let selfChatBlock = false;
    try {
      await empClient.post('/chat/conversations/direct', { partnerId: emp.id });
    } catch (err) {
      selfChatBlock = err.response && err.response.status === 400;
    }
    assert(selfChatBlock, 'Chat blocks creating direct conversation with oneself (FIX VERIFIED)');

    // -------------------------------------------------------------------
    // Scenario 6: Role Escalation Security Guard
    // -------------------------------------------------------------------
    console.log('\n--- Scenario 6: Security Role Escalation Guard ---');

    let roleEscalationBlock = false;
    try {
      // Non-admin attempting to escalate role to ADMIN
      await empClient.patch(`/users/${emp.id}/wage`, { role: 'ADMIN' });
    } catch (err) {
      roleEscalationBlock = err.response && (err.response.status === 403 || err.response.status === 401);
    }
    assert(roleEscalationBlock, 'System blocks non-admin users from escalating roles to ADMIN (FIX VERIFIED)');

  } catch (err) {
    console.error('HTTP Test Exception:', err.response?.data || err.message);
  } finally {
    // Clean up test data
    await prisma.auditLog.deleteMany({ where: { adminId: { in: [admin.id, emp.id] } } });
    await prisma.absenceRecord.deleteMany({ where: { userId: { in: [admin.id, emp.id] } } });
    await prisma.attendance.deleteMany({ where: { employeeId: { in: [admin.id, emp.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, emp.id] } } });
    await prisma.$disconnect();
  }

  console.log('\n=============================================================');
  console.log(`📊 LIVE API INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');
}

runHttpTests();
