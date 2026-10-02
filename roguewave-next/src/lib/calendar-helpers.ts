import type { Session, AttendanceRecordRow } from "./attendance-helpers";

export type CalendarOccurrence = {
  session_id: number;
  name: string;
  role: string;
  session_type: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  has_attendance: boolean;
  attendance_record_id: number | null;
  session_status: string | null;
};

/**
 * Format a Date object as a YYYY-MM-DD string using local time.
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Generate calendar occurrences for a given month from session definitions.
 *
 * - Once sessions appear only on their session_date
 * - Recurring sessions appear on each matching weekday in the month
 * - Attendance records are linked to occurrences
 */
export function generateCalendarOccurrences(
  sessions: Session[],
  year: number,
  month: number,
  attendanceRecords: AttendanceRecordRow[],
): CalendarOccurrence[] {
  const occurrences: CalendarOccurrence[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a lookup for attendance records by session_id + date
  const attendanceLookup = new Map<string, AttendanceRecordRow>();
  for (const record of attendanceRecords) {
    const key = `${record.session_id}:${record.attendance_date}`;
    attendanceLookup.set(key, record);
  }

  for (const session of sessions) {
    if (session.session_type === "once") {
      // Once session: appears only on session_date
      if (!session.session_date) continue;

      const sessionDate = new Date(session.session_date + "T00:00:00");
      if (
        sessionDate.getFullYear() !== year ||
        sessionDate.getMonth() !== month
      ) {
        continue;
      }

      const dateKey = formatDateKey(sessionDate);
      const attendance = attendanceLookup.get(`${session.id}:${dateKey}`);

      occurrences.push({
        session_id: session.id,
        name: session.name,
        role: session.role,
        session_type: session.session_type,
        date: dateKey,
        start_time: session.start_time ?? "00:00",
        end_time: session.end_time ?? "00:00",
        location: session.default_location,
        has_attendance: !!attendance,
        attendance_record_id: attendance?.id ?? null,
        session_status: attendance?.session_status ?? null,
      });
    } else if (session.session_type === "recurring") {
      // Recurring session: appears on each matching weekday
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();

        const matchingSchedules = session.session_schedules.filter(
          (s) => s.day_of_week === dayOfWeek,
        );

        for (const schedule of matchingSchedules) {
          const dateKey = formatDateKey(date);
          const attendance = attendanceLookup.get(`${session.id}:${dateKey}`);

          occurrences.push({
            session_id: session.id,
            name: session.name,
            role: session.role,
            session_type: session.session_type,
            date: dateKey,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            location: session.default_location,
            has_attendance: !!attendance,
            attendance_record_id: attendance?.id ?? null,
            session_status: attendance?.session_status ?? null,
          });
        }
      }
    }
  }

  // Sort by date, then by start_time
  occurrences.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.start_time.localeCompare(b.start_time);
  });

  return occurrences;
}
