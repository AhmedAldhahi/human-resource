import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  WorkLocation,
  OfficeScheduleDto,
  SetOfficeRosterDto,
  MeetingDto,
  CreateMeetingDto,
  MyScheduleSummaryDto,
  Role,
} from '@hrms/shared';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private getTodayStr(): string {
    const tz = process.env.TIMEZONE || 'Asia/Riyadh';
    return new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
  }

  // 1. Set Office Roster (HR / Admin)
  async setOfficeRoster(creatorId: string, dto: SetOfficeRosterDto): Promise<{ count: number }> {
    if (!dto.schedules || !Array.isArray(dto.schedules) || dto.schedules.length === 0) {
      throw new BadRequestException('Schedules list cannot be empty.');
    }

    let updatedCount = 0;
    for (const item of dto.schedules) {
      if (!item.userId || !item.date || !item.workLocation) {
        continue;
      }

      await this.prisma.officeSchedule.upsert({
        where: {
          userId_date: {
            userId: item.userId,
            date: item.date,
          },
        },
        create: {
          userId: item.userId,
          date: item.date,
          workLocation: item.workLocation as WorkLocation,
          notes: item.notes || null,
          createdById: creatorId,
        },
        update: {
          workLocation: item.workLocation as WorkLocation,
          notes: item.notes || null,
          createdById: creatorId,
        },
      });
      updatedCount++;
    }

      await this.auditService.logAction(
        creatorId,
        'SET_OFFICE_ROSTER',
        `Updated office roster for ${updatedCount} schedule entries`,
        undefined,
        'Weekly Office Roster',
      );

      return { count: updatedCount };
    }

    // 2. Get Office Roster (Filtered by Date Range / User)
    async getOfficeRoster(start?: string, end?: string, userId?: string): Promise<OfficeScheduleDto[]> {
      let whereClause: any = {};

      if (userId) {
        whereClause.userId = userId;
      }

      if (start || end) {
        whereClause.date = {};
        if (start) whereClause.date.gte = start;
        if (end) whereClause.date.lte = end;
      }

      const records = await this.prisma.officeSchedule.findMany({
        where: whereClause,
        include: {
          user: {
            select: { name: true, email: true, photoUrl: true },
          },
        },
        orderBy: { date: 'asc' },
      });

      return records.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user?.name,
        userEmail: r.user?.email,
        userPhotoUrl: r.user?.photoUrl,
        date: r.date,
        workLocation: r.workLocation as WorkLocation,
        notes: r.notes,
        createdById: r.createdById,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    }

    // 3. Create Meeting (HR / Admin)
    async createMeeting(creatorId: string, dto: CreateMeetingDto): Promise<MeetingDto> {
      if (!dto.title || !dto.startTime || !dto.endTime) {
        throw new BadRequestException('Meeting title, startTime, and endTime are required.');
      }

      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        throw new BadRequestException('Invalid start or end time for meeting.');
      }

      const meeting = await this.prisma.meeting.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          startTime: start,
          endTime: end,
          locationOrLink: dto.locationOrLink?.trim() || null,
          createdById: creatorId,
          attendees: {
            create: (dto.attendeeIds || []).map((uid) => ({
              userId: uid,
            })),
          },
        },
        include: {
          createdBy: { select: { name: true } },
          attendees: {
            include: {
              user: { select: { name: true, email: true, photoUrl: true } },
            },
          },
        },
      });

      await this.auditService.logAction(
        creatorId,
        'CREATE_MEETING',
        `Scheduled meeting "${meeting.title}" with ${meeting.attendees.length} attendee(s)`,
        meeting.id,
        meeting.title,
      );

      return this.mapMeeting(meeting);
    }

    // 4. Get Meetings (Filtered by user access)
    async getMeetings(userId: string, userRole: Role): Promise<MeetingDto[]> {
      const isHrOrAdmin = userRole === Role.HR || userRole === Role.ADMIN;

      let whereClause: any = {};
      if (!isHrOrAdmin) {
        whereClause = {
          OR: [
            { createdById: userId },
            { attendees: { some: { userId } } },
          ],
        };
      }

      const meetings = await this.prisma.meeting.findMany({
        where: whereClause,
        include: {
          createdBy: { select: { name: true } },
          attendees: {
            include: {
              user: { select: { name: true, email: true, photoUrl: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      return meetings.map((m) => this.mapMeeting(m));
    }

    // 5. Update Meeting
    async updateMeeting(creatorId: string, meetingId: string, dto: Partial<CreateMeetingDto>): Promise<MeetingDto> {
      const existing = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
      if (!existing) {
        throw new NotFoundException('Meeting not found.');
      }

      let updateData: any = {};
      if (dto.title) updateData.title = dto.title.trim();
      if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
      if (dto.locationOrLink !== undefined) updateData.locationOrLink = dto.locationOrLink?.trim() || null;
      if (dto.startTime) updateData.startTime = new Date(dto.startTime);
      if (dto.endTime) updateData.endTime = new Date(dto.endTime);

      if (dto.attendeeIds && Array.isArray(dto.attendeeIds)) {
        // Re-create attendees list
        await this.prisma.meetingAttendee.deleteMany({ where: { meetingId } });
        updateData.attendees = {
          create: dto.attendeeIds.map((uid) => ({ userId: uid })),
        };
      }

      const updated = await this.prisma.meeting.update({
        where: { id: meetingId },
        data: updateData,
        include: {
          createdBy: { select: { name: true } },
          attendees: {
            include: {
              user: { select: { name: true, email: true, photoUrl: true } },
            },
          },
        },
      });

      return this.mapMeeting(updated);
    }

    // 6. Delete Meeting
    async deleteMeeting(creatorId: string, meetingId: string): Promise<{ success: boolean }> {
      const existing = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
      if (!existing) {
        throw new NotFoundException('Meeting not found.');
      }

      await this.prisma.meeting.delete({ where: { id: meetingId } });

      await this.auditService.logAction(
        creatorId,
        'DELETE_MEETING',
        `Cancelled meeting "${existing.title}"`,
        meetingId,
        existing.title,
      );

    return { success: true };
  }

  // 7. Get Employee Unified Schedule Summary
  async getMySchedule(userId: string): Promise<MyScheduleSummaryDto> {
    const todayStr = this.getTodayStr();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { employeeType: true },
    });
    const isFixedIncome = user?.employeeType === 'FIXED';
    const defaultLocation = isFixedIncome ? WorkLocation.OFFICE : WorkLocation.HOME;

    // Get today's scheduled location
    const todaySchedule = await this.prisma.officeSchedule.findUnique({
      where: { userId_date: { userId, date: todayStr } },
    });
    const todayScheduledLocation = (todaySchedule?.workLocation as WorkLocation) || defaultLocation;

    // Get current week start (Sunday) and end (Saturday)
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay(); // 0 = Sunday
    const startOfWeek = new Date(todayDate);
    startOfWeek.setDate(todayDate.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startStr = startOfWeek.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
    const endStr = endOfWeek.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

    const weeklyRosterRecords = await this.prisma.officeSchedule.findMany({
      where: {
        userId,
        date: { gte: startStr, lte: endStr },
      },
      include: {
        user: { select: { name: true, email: true, photoUrl: true } },
      },
      orderBy: { date: 'asc' },
    });

    const officeDaysThisWeek: string[] = [];
    const homeDaysThisWeek: string[] = [];

    // Generate array for all 7 days of current week
    const weeklyRoster: OfficeScheduleDto[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

      const existingRecord = weeklyRosterRecords.find((r) => r.date === dateStr);
      const loc = existingRecord ? (existingRecord.workLocation as WorkLocation) : defaultLocation;

      if (loc === WorkLocation.OFFICE) {
        officeDaysThisWeek.push(dateStr);
      } else {
        homeDaysThisWeek.push(dateStr);
      }

      weeklyRoster.push({
        id: existingRecord?.id || `default-${dateStr}`,
        userId,
        date: dateStr,
        workLocation: loc,
        notes: existingRecord?.notes || null,
        createdById: existingRecord?.createdById || null,
        createdAt: existingRecord?.createdAt ? existingRecord.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: existingRecord?.updatedAt ? existingRecord.updatedAt.toISOString() : new Date().toISOString(),
      });
    }

    // Get upcoming meetings for user
    const upcomingMeetings = await this.getMeetings(userId, Role.EMPLOYEE);

    return {
      todayScheduledLocation,
      officeDaysThisWeek,
      homeDaysThisWeek,
      weeklyRoster,
      upcomingMeetings,
    };
  }

  private mapMeeting(m: any): MeetingDto {
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      startTime: m.startTime.toISOString(),
      endTime: m.endTime.toISOString(),
      locationOrLink: m.locationOrLink,
      createdById: m.createdById,
      creatorName: m.createdBy?.name,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      attendees: (m.attendees || []).map((a: any) => ({
        id: a.id,
        meetingId: a.meetingId,
        userId: a.userId,
        userName: a.user?.name,
        userEmail: a.user?.email,
        userPhotoUrl: a.user?.photoUrl,
        joinedAt: a.joinedAt ? a.joinedAt.toISOString() : new Date().toISOString(),
      })),
    };
  }
}
