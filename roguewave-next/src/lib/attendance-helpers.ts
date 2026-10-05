/* =========================
   SHARED ATTENDANCE TYPES
   ========================= */

export type SessionSchedule = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type SessionSwimmer = {
  swimmer_id: number;
  session_id: number;
  swimmers: { id: number; name: string; level: string } | null;
};

export type Session = {
  id: number;
  name: string;
  role: string;
  session_type: string;
  default_location: string | null;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_archived?: boolean;
  session_schedules: SessionSchedule[];
  session_swimmers: SessionSwimmer[];
};

export type AttendanceSwimmerRow = {
  id: number;
  attendance_id: number;
  swimmer_id: number | null;
  swimmer_name: string;
  attendance_status: string;
  created_at: string;
};

export type AttendanceRecordRow = {
  id: number;
  session_id: number;
  attendance_date: string;
  location: string | null;
  session_status: string;
  coach_status: string | null;
  created_at: string;
  updated_at: string;
  attendance_swimmers: AttendanceSwimmerRow[];
};

export type NormalizedAttendance = {
  id: number;
  session_id: number;
  attendance_date: string;
  location: string | null;
  session_status: string;
  coach_status: string | null;
  created_at: string;
  updated_at: string;
  swimmers: {
    id: number;
    swimmer_id: number | null;
    swimmer_name: string;
    attendance_status: string;
  }[];
};

/* =========================
   CONSTANTS
   ========================= */

export const VALID_SESSION_STATUSES = [
  "normal",
  "cancelled",
  "no_session",
  "holiday",
] as const;

export const VALID_COACH_STATUSES = [
  "present",
  "absent",
  "cancelled",
  "no_session",
  "holiday",
] as const;

/* =========================
   HELPERS
   ========================= */

export function isValidDateString(value: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return false;

  return true;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getDayOfWeek(dateString: string): number {
  return new Date(dateString + "T00:00:00Z").getUTCDay();
}

export function getColomboToday(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function normalizeAttendanceRecord(
  row: AttendanceRecordRow,
): NormalizedAttendance {
  const { attendance_swimmers, ...rest } = row;
  return {
    ...rest,
    swimmers: (attendance_swimmers ?? []).map((s) => ({
      id: s.id,
      swimmer_id: s.swimmer_id,
      swimmer_name: s.swimmer_name,
      attendance_status: s.attendance_status,
    })),
  };
}

/**
 * Extract assigned swimmers from a session, filtering out null joins.
 */
export function getAssignedSwimmers(session: Session): { id: number; name: string; level: string }[] {
  return session.session_swimmers
    .map((ss) => ss.swimmers)
    .filter(
      (swimmer): swimmer is { id: number; name: string; level: string } =>
        swimmer !== null,
    );
}

/**
 * Build rollback-safe swimmer restore rows.
 * Uses the provided attendanceId instead of relying on the nested query.
 * Omits the primary key `id` so Supabase generates new ones.
 */
export function buildRestoreRows(
  swimmers: AttendanceSwimmerRow[],
  attendanceId: number,
): { attendance_id: number; swimmer_id: number | null; swimmer_name: string; attendance_status: string }[] {
  return swimmers.map((s) => ({
    attendance_id: attendanceId,
    swimmer_id: s.swimmer_id,
    swimmer_name: s.swimmer_name,
    attendance_status: s.attendance_status,
  }));
}

/* =========================
   ATTENDANCE SUMMARY CALCULATION
   ========================= */

export type AttendanceSummary = {
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  sessions_completed: number;
};

/**
 * Calculate attendance summary from swimmer attendance rows.
 * Excludes cancelled sessions from all counts.
 */
export function calculateAttendanceSummary(
  rows: { attendance_status: string; session_status?: string }[],
): AttendanceSummary {
  const validRows = rows.filter((r) => r.session_status !== "cancelled");

  const total_records = validRows.length;
  const present_count = validRows.filter((r) => r.attendance_status === "present").length;
  const absent_count = validRows.filter((r) => r.attendance_status === "absent").length;

  const denominator = present_count + absent_count;
  const attendance_percentage = denominator === 0 ? 0 : Math.round((present_count / denominator) * 100);

  const sessions_completed = present_count;

  return {
    total_records,
    present_count,
    absent_count,
    attendance_percentage,
    sessions_completed,
  };
}
