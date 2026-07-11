// ─── Enums ───────────────────────────────────────────────────────────────────

export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  HR = 'HR',
  ADMIN = 'ADMIN',
}

export enum CardType {
  BLUE_PLUS_30 = 'BLUE_PLUS_30',
  GREEN_PLUS_10 = 'GREEN_PLUS_10',
  YELLOW_MINUS_10 = 'YELLOW_MINUS_10',
  RED_MINUS_30 = 'RED_MINUS_30',
}

export enum AttendanceStatus {
  CLOCKED_IN = 'CLOCKED_IN',
  CLOCKED_OUT = 'CLOCKED_OUT',
}

// ─── Card Point Values ──────────────────────────────────────────────────────

export const CARD_POINT_VALUES: Record<CardType, number> = {
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
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  netCardPoints: number;
  createdAt: string;
}

// ─── Attendance DTOs ────────────────────────────────────────────────────────

export interface ClockInDto {
  intendedTask: string;
}

export interface AttendanceResponseDto {
  id: string;
  employeeId: string;
  clockInTime: string;
  clockOutTime: string | null;
  intendedTask: string;
  status: AttendanceStatus;
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
