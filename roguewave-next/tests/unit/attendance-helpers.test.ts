import { describe, it, expect } from "vitest";
import {
  isValidDateString,
  isPositiveNumber,
  getDayOfWeek,
  normalizeAttendanceRecord,
  getAssignedSwimmers,
  buildRestoreRows,
  VALID_SESSION_STATUSES,
  VALID_COACH_STATUSES,
  type Session,
  type AttendanceRecordRow,
  type AttendanceSwimmerRow,
} from "@/lib/attendance-helpers";

/* =========================
   isValidDateString
   ========================= */

describe("isValidDateString", () => {
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidDateString("2026-09-30")).toBe(true);
    expect(isValidDateString("2020-01-01")).toBe(true);
    expect(isValidDateString("2024-12-31")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidDateString("30-09-2026")).toBe(false);
    expect(isValidDateString("2026/09/30")).toBe(false);
    expect(isValidDateString("2026-9-30")).toBe(false);
    expect(isValidDateString("2026-09-3")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("")).toBe(false);
  });

  it("rejects invalid month values", () => {
    expect(isValidDateString("2026-00-15")).toBe(false);
    expect(isValidDateString("2026-13-15")).toBe(false);
  });

  it("rejects invalid day values", () => {
    expect(isValidDateString("2026-09-00")).toBe(false);
    expect(isValidDateString("2026-09-32")).toBe(false);
  });

  it("rejects days beyond month length", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-04-31")).toBe(false);
    expect(isValidDateString("2026-06-31")).toBe(false);
    expect(isValidDateString("2026-09-31")).toBe(false);
    expect(isValidDateString("2026-11-31")).toBe(false);
  });

  it("allows leap year Feb 29", () => {
    expect(isValidDateString("2024-02-29")).toBe(true);
  });

  it("rejects non-leap year Feb 29", () => {
    expect(isValidDateString("2026-02-29")).toBe(false);
  });
});

/* =========================
   isPositiveNumber
   ========================= */

describe("isPositiveNumber", () => {
  it("accepts positive integers", () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(100)).toBe(true);
    expect(isPositiveNumber(999999)).toBe(true);
  });

  it("accepts positive floats", () => {
    expect(isPositiveNumber(0.5)).toBe(true);
    expect(isPositiveNumber(1.5)).toBe(true);
  });

  it("rejects zero", () => {
    expect(isPositiveNumber(0)).toBe(false);
  });

  it("rejects negative numbers", () => {
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(-0.5)).toBe(false);
  });

  it("rejects non-number types", () => {
    expect(isPositiveNumber("1")).toBe(false);
    expect(isPositiveNumber(null)).toBe(false);
    expect(isPositiveNumber(undefined)).toBe(false);
    expect(isPositiveNumber({})).toBe(false);
    expect(isPositiveNumber([])).toBe(false);
    expect(isPositiveNumber(true)).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(isPositiveNumber(NaN)).toBe(false);
    expect(isPositiveNumber(Infinity)).toBe(false);
    expect(isPositiveNumber(-Infinity)).toBe(false);
  });
});

/* =========================
   getDayOfWeek
   ========================= */

describe("getDayOfWeek", () => {
  it("returns 0 for Sunday", () => {
    expect(getDayOfWeek("2026-09-27")).toBe(0);
  });

  it("returns 1 for Monday", () => {
    expect(getDayOfWeek("2026-09-28")).toBe(1);
  });

  it("returns 6 for Saturday", () => {
    expect(getDayOfWeek("2026-10-03")).toBe(6);
  });

  it("returns correct day for known dates", () => {
    expect(getDayOfWeek("2026-09-30")).toBe(3); // Wednesday
    expect(getDayOfWeek("2026-09-24")).toBe(4); // Thursday
    expect(getDayOfWeek("2026-09-25")).toBe(5); // Friday
  });
});

/* =========================
   VALID_SESSION_STATUSES / VALID_COACH_STATUSES
   ========================= */

describe("VALID_SESSION_STATUSES", () => {
  it("contains expected statuses", () => {
    expect(VALID_SESSION_STATUSES).toEqual([
      "normal",
      "cancelled",
      "no_session",
      "holiday",
    ]);
  });
});

describe("VALID_COACH_STATUSES", () => {
  it("contains expected statuses", () => {
    expect(VALID_COACH_STATUSES).toEqual([
      "present",
      "absent",
      "cancelled",
      "no_session",
      "holiday",
    ]);
  });
});

/* =========================
   normalizeAttendanceRecord
   ========================= */

describe("normalizeAttendanceRecord", () => {
  it("normalizes a record with swimmers", () => {
    const row: AttendanceRecordRow = {
      id: 1,
      session_id: 10,
      attendance_date: "2026-09-30",
      location: "Pool A",
      session_status: "normal",
      coach_status: null,
      created_at: "2026-09-30T10:00:00Z",
      updated_at: "2026-09-30T10:00:00Z",
      attendance_swimmers: [
        {
          id: 100,
          attendance_id: 1,
          swimmer_id: 5,
          swimmer_name: "Alice",
          attendance_status: "present",
          created_at: "2026-09-30T10:00:00Z",
        },
        {
          id: 101,
          attendance_id: 1,
          swimmer_id: 6,
          swimmer_name: "Bob",
          attendance_status: "absent",
          created_at: "2026-09-30T10:00:00Z",
        },
      ],
    };

    const result = normalizeAttendanceRecord(row);

    expect(result.id).toBe(1);
    expect(result.session_id).toBe(10);
    expect(result.attendance_date).toBe("2026-09-30");
    expect(result.location).toBe("Pool A");
    expect(result.session_status).toBe("normal");
    expect(result.coach_status).toBeNull();
    expect(result.swimmers).toHaveLength(2);
    expect(result.swimmers[0]).toEqual({
      id: 100,
      swimmer_id: 5,
      swimmer_name: "Alice",
      attendance_status: "present",
    });
    expect(result.swimmers[1]).toEqual({
      id: 101,
      swimmer_id: 6,
      swimmer_name: "Bob",
      attendance_status: "absent",
    });
  });

  it("handles null swimmer_id (historical/deleted swimmers)", () => {
    const row: AttendanceRecordRow = {
      id: 2,
      session_id: 10,
      attendance_date: "2026-09-30",
      location: "Pool A",
      session_status: "normal",
      coach_status: null,
      created_at: "2026-09-30T10:00:00Z",
      updated_at: "2026-09-30T10:00:00Z",
      attendance_swimmers: [
        {
          id: 200,
          attendance_id: 2,
          swimmer_id: null,
          swimmer_name: "Deleted Swimmer",
          attendance_status: "present",
          created_at: "2026-09-30T10:00:00Z",
        },
      ],
    };

    const result = normalizeAttendanceRecord(row);

    expect(result.swimmers).toHaveLength(1);
    expect(result.swimmers[0].swimmer_id).toBeNull();
    expect(result.swimmers[0].swimmer_name).toBe("Deleted Swimmer");
  });

  it("handles empty swimmers array", () => {
    const row: AttendanceRecordRow = {
      id: 3,
      session_id: 10,
      attendance_date: "2026-09-30",
      location: null,
      session_status: "cancelled",
      coach_status: null,
      created_at: "2026-09-30T10:00:00Z",
      updated_at: "2026-09-30T10:00:00Z",
      attendance_swimmers: [],
    };

    const result = normalizeAttendanceRecord(row);

    expect(result.swimmers).toEqual([]);
    expect(result.location).toBeNull();
  });

  it("handles missing attendance_swimmers (undefined)", () => {
    const row = {
      id: 4,
      session_id: 10,
      attendance_date: "2026-09-30",
      location: "Pool B",
      session_status: "normal",
      coach_status: null,
      created_at: "2026-09-30T10:00:00Z",
      updated_at: "2026-09-30T10:00:00Z",
    } as AttendanceRecordRow;

    const result = normalizeAttendanceRecord(row);

    expect(result.swimmers).toEqual([]);
  });
});

/* =========================
   getAssignedSwimmers
   ========================= */

describe("getAssignedSwimmers", () => {
  it("returns only non-null swimmers", () => {
    const session: Session = {
      id: 1,
      name: "Test Session",
      role: "Head Coach",
      session_type: "recurring",
      default_location: "Pool A",
      session_date: null,
      start_time: null,
      end_time: null,
      session_schedules: [],
      session_swimmers: [
        { swimmer_id: 1, session_id: 1, swimmers: { id: 1, name: "Alice", level: "A" } },
        { swimmer_id: 2, session_id: 1, swimmers: null },
        { swimmer_id: 3, session_id: 1, swimmers: { id: 3, name: "Charlie", level: "B" } },
      ],
    };

    const result = getAssignedSwimmers(session);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, name: "Alice", level: "A" });
    expect(result[1]).toEqual({ id: 3, name: "Charlie", level: "B" });
  });

  it("returns empty array when all swimmers are null", () => {
    const session: Session = {
      id: 1,
      name: "Test Session",
      role: "Head Coach",
      session_type: "recurring",
      default_location: "Pool A",
      session_date: null,
      start_time: null,
      end_time: null,
      session_schedules: [],
      session_swimmers: [
        { swimmer_id: 1, session_id: 1, swimmers: null },
        { swimmer_id: 2, session_id: 1, swimmers: null },
      ],
    };

    const result = getAssignedSwimmers(session);

    expect(result).toEqual([]);
  });

  it("returns empty array when no swimmers assigned", () => {
    const session: Session = {
      id: 1,
      name: "Test Session",
      role: "Head Coach",
      session_type: "recurring",
      default_location: "Pool A",
      session_date: null,
      start_time: null,
      end_time: null,
      session_schedules: [],
      session_swimmers: [],
    };

    const result = getAssignedSwimmers(session);

    expect(result).toEqual([]);
  });
});

/* =========================
   buildRestoreRows
   ========================= */

describe("buildRestoreRows", () => {
  it("builds restore rows with the given attendance ID", () => {
    const swimmers: AttendanceSwimmerRow[] = [
      {
        id: 100,
        attendance_id: 1,
        swimmer_id: 5,
        swimmer_name: "Alice",
        attendance_status: "present",
        created_at: "2026-09-30T10:00:00Z",
      },
      {
        id: 101,
        attendance_id: 1,
        swimmer_id: 6,
        swimmer_name: "Bob",
        attendance_status: "absent",
        created_at: "2026-09-30T10:00:00Z",
      },
    ];

    const result = buildRestoreRows(swimmers, 42);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      attendance_id: 42,
      swimmer_id: 5,
      swimmer_name: "Alice",
      attendance_status: "present",
    });
    expect(result[1]).toEqual({
      attendance_id: 42,
      swimmer_id: 6,
      swimmer_name: "Bob",
      attendance_status: "absent",
    });
  });

  it("preserves null swimmer_id for historical swimmers", () => {
    const swimmers: AttendanceSwimmerRow[] = [
      {
        id: 200,
        attendance_id: 1,
        swimmer_id: null,
        swimmer_name: "Deleted Swimmer",
        attendance_status: "present",
        created_at: "2026-09-30T10:00:00Z",
      },
    ];

    const result = buildRestoreRows(swimmers, 42);

    expect(result).toHaveLength(1);
    expect(result[0].swimmer_id).toBeNull();
    expect(result[0].swimmer_name).toBe("Deleted Swimmer");
  });

  it("omits the primary key id so Supabase generates new ones", () => {
    const swimmers: AttendanceSwimmerRow[] = [
      {
        id: 100,
        attendance_id: 1,
        swimmer_id: 5,
        swimmer_name: "Alice",
        attendance_status: "present",
        created_at: "2026-09-30T10:00:00Z",
      },
    ];

    const result = buildRestoreRows(swimmers, 42);

    expect(result[0]).not.toHaveProperty("id");
    expect(result[0]).not.toHaveProperty("created_at");
  });

  it("returns empty array for empty input", () => {
    const result = buildRestoreRows([], 42);

    expect(result).toEqual([]);
  });
});
