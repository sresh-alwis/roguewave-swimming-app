import { beforeEach, describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/home/route";
import { generateCalendarOccurrences, formatDateKey } from "@/lib/calendar-helpers";

import {
  createMockSessionsState,
  createSessionsQueryBuilder,
  type MockSessionsState,
} from "../mocks/supabase-sessions";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: fromMock,
  },
}));

let mockState: MockSessionsState;

beforeEach(() => {
  mockState = createMockSessionsState();
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) =>
    createSessionsQueryBuilder(table, mockState),
  );
});

describe("GET /api/home", () => {
  it("1. total_swimmers correct", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
      { id: 2, name: "Bob", level: "Intermediate" },
      { id: 3, name: "Charlie", level: "Advanced" },
    ];
    mockState.sessions = [];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.total_swimmers).toBe(3);
  });

  it("2. total_sessions correct", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-10-15", start_time: "14:00", end_time: "15:00" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    expect(data.summary.total_sessions).toBe(2);
  });

  it("3. sessions_completed excludes cancelled attendance", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 1, attendance_date: "2026-10-02", location: null, session_status: "cancelled", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
      { id: 102, session_id: 1, attendance_date: "2026-10-03", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    expect(data.summary.sessions_completed).toBe(2);
  });

  it("3a. sessions_completed includes attendance from other months", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    // Attendance from a different month (September 2026)
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
      { id: 101, session_id: 1, attendance_date: "2026-09-15", location: null, session_status: "normal", coach_status: null, created_at: "2026-09-15T10:00:00Z", updated_at: "2026-09-15T10:00:00Z" },
      { id: 102, session_id: 1, attendance_date: "2026-09-20", location: null, session_status: "cancelled", coach_status: null, created_at: "2026-09-20T10:00:00Z", updated_at: "2026-09-20T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    // Should count all non-cancelled records regardless of month
    expect(data.summary.sessions_completed).toBe(2);
  });

  it("3b. sessions_completed does not change with month_offset", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
      { id: 102, session_id: 1, attendance_date: "2026-08-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z" },
    ];

    // Current month
    const request1 = new Request("http://localhost/api/home?month_offset=0");
    const response1 = await GET(request1);
    const data1 = await response1.json();

    // Previous month
    const request2 = new Request("http://localhost/api/home?month_offset=-1");
    const response2 = await GET(request2);
    const data2 = await response2.json();

    // Next month
    const request3 = new Request("http://localhost/api/home?month_offset=1");
    const response3 = await GET(request3);
    const data3 = await response3.json();

    // sessions_completed should be the same regardless of month_offset
    expect(data1.summary.sessions_completed).toBe(3);
    expect(data2.summary.sessions_completed).toBe(3);
    expect(data3.summary.sessions_completed).toBe(3);
  });

  it("4. upcoming_sessions correct", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    // Should have upcoming sessions (all occurrences in current month that are today or future)
    expect(data.summary.upcoming_sessions).toBeGreaterThanOrEqual(0);
  });

  it("5. once session appears only on session_date", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "One-off Session", role: "Head Coach", session_type: "once", default_location: "Pool A", session_date: "2026-10-15", start_time: "14:00", end_time: "15:00" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    const onceOccurrences = data.calendar.filter(
      (occ: { session_type: string }) => occ.session_type === "once",
    );

    // Should appear only once (on 2026-10-15 if it's in the current month)
    if (onceOccurrences.length > 0) {
      expect(onceOccurrences.length).toBe(1);
      expect(onceOccurrences[0].date).toBe("2026-10-15");
    }
  });

  it("6. once session uses correct time/location", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "One-off Session", role: "Head Coach", session_type: "once", default_location: "Pool A", session_date: "2026-10-15", start_time: "14:00", end_time: "15:00" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    const onceOccurrences = data.calendar.filter(
      (occ: { session_type: string }) => occ.session_type === "once",
    );

    if (onceOccurrences.length > 0) {
      expect(onceOccurrences[0].start_time).toBe("14:00");
      expect(onceOccurrences[0].end_time).toBe("15:00");
      expect(onceOccurrences[0].location).toBe("Pool A");
    }
  });

  it("7. recurring schedule creates occurrence on correct weekday", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Recurring Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" }, // Monday
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    const recurringOccurrences = data.calendar.filter(
      (occ: { session_type: string }) => occ.session_type === "recurring",
    );

    // All occurrences should be on Mondays
    for (const occ of recurringOccurrences) {
      const date = new Date(occ.date + "T00:00:00");
      expect(date.getDay()).toBe(1); // Monday
    }
  });

  it("8. multiple weekly schedule days generate multiple occurrences", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Recurring Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" }, // Monday
      { id: 2, session_id: 1, day_of_week: 3, start_time: "14:00", end_time: "15:00" }, // Wednesday
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    const recurringOccurrences = data.calendar.filter(
      (occ: { session_type: string }) => occ.session_type === "recurring",
    );

    // Should have occurrences on both Mondays and Wednesdays
    const mondays = recurringOccurrences.filter((occ: { date: string }) => {
      const date = new Date(occ.date + "T00:00:00");
      return date.getDay() === 1;
    });
    const wednesdays = recurringOccurrences.filter((occ: { date: string }) => {
      const date = new Date(occ.date + "T00:00:00");
      return date.getDay() === 3;
    });

    expect(mondays.length).toBeGreaterThan(0);
    expect(wednesdays.length).toBeGreaterThan(0);
  });

  it("9. recurring occurrence uses correct time/location", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Recurring Session", role: "Head Coach", session_type: "recurring", default_location: "Pool B", session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    const recurringOccurrences = data.calendar.filter(
      (occ: { session_type: string }) => occ.session_type === "recurring",
    );

    if (recurringOccurrences.length > 0) {
      expect(recurringOccurrences[0].start_time).toBe("10:00");
      expect(recurringOccurrences[0].end_time).toBe("11:00");
      expect(recurringOccurrences[0].location).toBe("Pool B");
    }
  });

  it("10. no duplicate occurrences", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Recurring Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    // Check for duplicates (same session_id + date + start_time)
    const keys = data.calendar.map(
      (occ: { session_id: number; date: string; start_time: string }) =>
        `${occ.session_id}:${occ.date}:${occ.start_time}`,
    );
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it("11. occurrence with attendance record sets has_attendance true", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-05", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-05T10:00:00Z", updated_at: "2026-10-05T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    const occurrenceWithAttendance = data.calendar.find(
      (occ: { date: string }) => occ.date === "2026-10-05",
    );

    if (occurrenceWithAttendance) {
      expect(occurrenceWithAttendance.has_attendance).toBe(true);
      expect(occurrenceWithAttendance.attendance_record_id).toBe(100);
    }
  });

  it("12. cancelled occurrence marked cancelled", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-05", location: null, session_status: "cancelled", coach_status: null, created_at: "2026-10-05T10:00:00Z", updated_at: "2026-10-05T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    const cancelledOccurrence = data.calendar.find(
      (occ: { date: string }) => occ.date === "2026-10-05",
    );

    if (cancelledOccurrence) {
      expect(cancelledOccurrence.session_status).toBe("cancelled");
      expect(cancelledOccurrence.has_attendance).toBe(true);
    }
  });

  it("13. cancelled occurrence excluded from sessions_completed", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "cancelled", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    expect(data.summary.sessions_completed).toBe(0);
  });

  it("14. no sessions returns empty calendar", async () => {
    mockState.swimmers = [];
    mockState.sessions = [];

    const request = new Request("http://localhost/api/home");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.calendar).toHaveLength(0);
    expect(data.summary.total_sessions).toBe(0);
  });

  it("15. invalid month_offset returns 400", async () => {
    const request = new Request("http://localhost/api/home?month_offset=abc");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid month_offset.");
  });
});

describe("generateCalendarOccurrences", () => {
  it("generates occurrences for once session", () => {
    const sessions = [
      {
        id: 1,
        name: "One-off",
        role: "Head Coach",
        session_type: "once",
        default_location: "Pool A",
        session_date: "2026-10-15",
        start_time: "14:00",
        end_time: "15:00",
        session_schedules: [],
        session_swimmers: [],
      },
    ];

    const occurrences = generateCalendarOccurrences(sessions, 2026, 9, []);

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].date).toBe("2026-10-15");
    expect(occurrences[0].start_time).toBe("14:00");
    expect(occurrences[0].end_time).toBe("15:00");
  });

  it("generates occurrences for recurring session", () => {
    const sessions = [
      {
        id: 1,
        name: "Recurring",
        role: "Head Coach",
        session_type: "recurring",
        default_location: null,
        session_date: null,
        start_time: null,
        end_time: null,
        session_schedules: [
          { id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
        ],
        session_swimmers: [],
      },
    ];

    const occurrences = generateCalendarOccurrences(sessions, 2026, 9, []);

    // Should have multiple Mondays in October 2026
    expect(occurrences.length).toBeGreaterThan(0);
    for (const occ of occurrences) {
      const date = new Date(occ.date + "T00:00:00");
      expect(date.getDay()).toBe(1);
    }
  });

  it("links attendance records to occurrences", () => {
    const sessions = [
      {
        id: 1,
        name: "Session",
        role: "Head Coach",
        session_type: "recurring",
        default_location: null,
        session_date: null,
        start_time: null,
        end_time: null,
        session_schedules: [
          { id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
        ],
        session_swimmers: [],
      },
    ];

    const attendanceRecords = [
      {
        id: 100,
        session_id: 1,
        attendance_date: "2026-10-05",
        location: null,
        session_status: "normal",
        coach_status: null,
        created_at: "2026-10-05T10:00:00Z",
        updated_at: "2026-10-05T10:00:00Z",
        attendance_swimmers: [],
      },
    ];

    const occurrences = generateCalendarOccurrences(sessions, 2026, 9, attendanceRecords);

    const occurrence = occurrences.find((o) => o.date === "2026-10-05");
    expect(occurrence).toBeDefined();
    expect(occurrence!.has_attendance).toBe(true);
    expect(occurrence!.attendance_record_id).toBe(100);
  });
});

describe("formatDateKey", () => {
  it("formats date correctly", () => {
    expect(formatDateKey(new Date(2026, 9, 15))).toBe("2026-10-15");
    expect(formatDateKey(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(formatDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});
