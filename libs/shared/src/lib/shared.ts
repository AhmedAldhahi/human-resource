// ─── Enums ───────────────────────────────────────────────────────────────────

export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  HR = 'HR',
  ADMIN = 'ADMIN',
}

export enum CardType {
  GOLD_PLUS_50 = 'GOLD_PLUS_50',
  BLUE_PLUS_30 = 'BLUE_PLUS_30',
  GREEN_PLUS_10 = 'GREEN_PLUS_10',
  YELLOW_MINUS_10 = 'YELLOW_MINUS_10',
  RED_MINUS_30 = 'RED_MINUS_30',
}

export enum AttendanceStatus {
  CLOCKED_IN = 'CLOCKED_IN',
  CLOCKED_OUT = 'CLOCKED_OUT',
}

export enum EmployeeType {
  FIXED = 'FIXED',
  PER_HOUR = 'PER_HOUR',
}

export enum WorkLocation {
  OFFICE = 'OFFICE',
  HOME = 'HOME',
}

export enum AbsenceType {
  SICK_LEAVE = 'SICK_LEAVE',
  REGULAR = 'REGULAR',
  VACATION = 'VACATION',
  HOURLY_OFF = 'HOURLY_OFF',
  EARLY_LEAVE = 'EARLY_LEAVE',
}

export enum AbsenceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
}

// ─── Card Point Values ──────────────────────────────────────────────────────

export const CARD_POINT_VALUES: Record<CardType, number> = {
  [CardType.GOLD_PLUS_50]: 50,
  [CardType.BLUE_PLUS_30]: 30,
  [CardType.GREEN_PLUS_10]: 10,
  [CardType.YELLOW_MINUS_10]: -10,
  [CardType.RED_MINUS_30]: -30,
};

// ─── Auth DTOs ──────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  user: UserResponseDto;
}

// ─── User DTOs ──────────────────────────────────────────────────────────────

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: Role;
  employeeType?: EmployeeType;
  monthlySalary?: number;
  hourlyWage?: number;
  transportationAllowance?: number;
  recurringBonus?: number;
  phone?: string;
  department?: string;
  bio?: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  employeeType: EmployeeType;
  monthlySalary: number;
  photoUrl: string | null;
  absenceDaysLeft: number;
  sickDaysLeft: number;
  vacationDaysLeft: number;
  earlyLeaveMinutesAccumulated: number;
  netCardPoints: number;
  hourlyWage: number;
  transportationAllowance: number;
  recurringBonus: number;
  phone?: string | null;
  department?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  customEmoji?: string | null;
  tsUsername?: string | null;
  createdAt: string;
}

export interface UpdateActiveStatusDto {
  isActive: boolean;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  department?: string;
  bio?: string;
  customStatus?: string;
  customEmoji?: string;
  tsUsername?: string;
}

export interface UpdateWageDto {
  hourlyWage?: number;
  transportationAllowance?: number;
  recurringBonus?: number;
  role?: Role;
  department?: string;
}

export interface UpdateEmployeeTypeDto {
  employeeType: EmployeeType;
  monthlySalary?: number;
  hourlyWage?: number;
  transportationAllowance?: number;
  recurringBonus?: number;
}

// ─── Attendance DTOs ────────────────────────────────────────────────────────

export interface ClockInDto {
  intendedTask: string;
  workLocation?: WorkLocation;
}

export interface ClockOutDto {
  completedTasksCount?: number | null;
  clockOutNote?: string | null;
}

export interface AttendanceResponseDto {
  id: string;
  employeeId: string;
  clockInTime: string;
  clockOutTime: string | null;
  intendedTask: string;
  status: AttendanceStatus;
  workLocation: WorkLocation;
  latePenalty: boolean;
  penaltyMinutes: number;
  completedTasksCount?: number | null;
  clockOutNote?: string | null;
}

export interface UpdateAttendanceDto {
  clockInTime?: string;
  clockOutTime?: string | null;
  intendedTask?: string;
  status?: AttendanceStatus;
  workLocation?: WorkLocation;
  latePenalty?: boolean;
  penaltyMinutes?: number;
  completedTasksCount?: number | null;
  clockOutNote?: string | null;
}

// ─── Performance Card DTOs ──────────────────────────────────────────────────

export interface IssueCardDto {
  employeeId: string;
  cardType: CardType;
  reason: string;
}

export interface CardResponseDto {
  id: string;
  employeeId: string;
  issuerId: string;
  cardType: CardType;
  reason: string;
  issuedAt: string;
  employeeName?: string;
  issuerName?: string;
}

// ─── Payroll DTOs ───────────────────────────────────────────────────────────

export interface SavePayrollDto {
  userId: string;
  month: string; // YYYY-MM
  baseWage: number;
  transportationAllowance: number;
  recurringBonus: number;
  approvedHours: number;
  transportationDeductions: number;
  bonusAmount: number;
  bonusNotes?: string | null;
  deductionAmount: number;
  deductionNotes?: string | null;
  cardPointsReference: number;
  finalPayout: number;
  status?: PayrollStatus;
}

export interface PayrollRecordDto {
  id: string;
  userId: string;
  month: string;
  baseWage: number;
  transportationAllowance: number;
  recurringBonus: number;
  approvedHours: number;
  transportationDeductions: number;
  bonusAmount: number;
  bonusNotes: string | null;
  deductionAmount: number;
  deductionNotes: string | null;
  cardPointsReference: number;
  finalPayout: number;
  status: PayrollStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DraftPayrollDto {
  userId: string;
  name: string;
  email: string;
  employeeType: EmployeeType;
  monthlySalary: number;
  hourlyWage: number;
  transportationAllowance: number;
  recurringBonus: number;
  trackedHours: number;
  transportationDeductions: number;
  wfhDays: number;
  cardPointsReference: number;
  savedApprovedHours?: number;
  savedBonusAmount?: number;
  savedBonusNotes?: string;
  savedDeductionAmount?: number;
  savedDeductionNotes?: string;
  savedStatus?: PayrollStatus;
}

// ─── Absence DTOs ───────────────────────────────────────────────────────────

export interface CreateAbsenceDto {
  date: string; // YYYY-MM-DD
  type: AbsenceType;
  reason?: string;
  earlyLeaveMinutes?: number;
}

export interface AbsenceRecordResponseDto {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  date: string;
  type: AbsenceType;
  status: AbsenceStatus;
  reason?: string | null;
  documentUrl?: string | null;
  earlyLeaveMinutes?: number | null;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAbsenceStatusDto {
  status: AbsenceStatus;
}

// ─── Reports DTOs ───────────────────────────────────────────────────────────

export interface OverviewReportDto {
  totalEmployees: number;
  fixedIncomeCount: number;
  perHourCount: number;
  todayClockedIn: number;
  todayOfficeCount: number;
  todayHomeCount: number;
  todayLateCount: number;
  totalAbsencesThisMonth: number;
}

export interface AttendanceReportDto {
  date: string;
  totalClockIns: number;
  officeCount: number;
  homeCount: number;
  lateCount: number;
}

export interface PayrollItemDto {
  userId: string;
  name: string;
  email: string;
  department?: string | null;
  employeeType: EmployeeType;
  monthlySalary: number;
  hourlyWage: number;
  totalHoursWorked: number;
  penaltyMinutesTotal: number;
  unpaidAbsenceDays: number;
  netCardPoints: number;
  calculatedCompensation: number;
}

// ─── Presence & Live Radar DTOs ─────────────────────────────────────────────

export enum PresenceStatus {
  ONLINE_OFFICE = 'ONLINE_OFFICE',
  ONLINE_REMOTE = 'ONLINE_REMOTE',
  ON_LEAVE = 'ON_LEAVE',
  OFFLINE = 'OFFLINE',
}

export interface OnlineStatusRecordDto {
  userId: string;
  name: string;
  email: string;
  role: Role;
  department?: string | null;
  photoUrl?: string | null;
  status: PresenceStatus;
  isOnline: boolean;
  clockInTime?: string | null;
  workLocation?: WorkLocation | null;
  intendedTask?: string | null;
  customStatus?: string | null;
  customEmoji?: string | null;
  absenceType?: AbsenceType | null;
  absenceReason?: string | null;
  netCardPoints: number;
}

export interface UpdateCustomStatusDto {
  customStatus?: string | null;
  customEmoji?: string | null;
}

export interface PresenceStatsDto {
  totalEmployees: number;
  onlineCount: number;
  officeCount: number;
  remoteCount: number;
  onLeaveCount: number;
  offlineCount: number;
}

// ─── Voadera Tracker DTOs ───────────────────────────────────────────────────

export interface VoaderaEmployeeDto {
  id: string;
  windowsId: string;
  name: string;
  department: string;
  totalTime: string;
  activeTime: string;
  idleTime: string;
  longestIdle: string;
  inOfficeToday: boolean;
  idleLimit: number;
  forceLogoff: boolean;
  securityAlerts: VoaderaSecurityAlertDto[];
}

export interface VoaderaSessionDto {
  id: string;
  employeeId: string;
  loginTime: string;
  logoutTime: string | null;
  lastSeen: string;
}

export interface VoaderaDailyReportDto {
  date: string;
  totalTime: string;
  activeTime: string;
  idleTime: string;
  longestIdle: string;
}

export interface VoaderaSecurityAlertDto {
  id: string;
  tsUsername: string;
  alertType: string;
  severity?: string | null;
  reason?: string | null;
  timestamp: string;
  durationSeconds?: number | null;
  totalJigglerMinutes?: number | null;
  totalGenuineMinutes?: number | null;
}

