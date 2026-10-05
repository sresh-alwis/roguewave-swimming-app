import { beforeEach, describe, it, expect, vi } from "vitest";
import { GET as GET_HOME } from "@/app/api/home/route";
import { GET as GET_MY_INFO } from "@/app/api/my-info/route";
import { PATCH as PATCH_ATTENDANCE } from "@/app/api/attendance/[id]/route";
import { calculateDurationMinutes, formatDuration } from "@/lib/attendance-helpers";

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

describe("V1 Attendance Status + Coaching Record (Final Rules)", () => {
  /* ========================================
     1. Head Coach normal automatically counts as personally coached
     ======================================== */
  it("1. Head Coach normal automatically counts as personally coached", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: "present", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.my_coaching_sessions).toBe(1);
  });

  /* ========================================
     2. Head Coach normal counts even when historical coach_status is null
     ======================================== */
  it("2. Head Coach normal counts even when historical coach_status is null", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    // Head Coach normal counts even with null coach_status (presence implied)
    expect(data.my_coaching_sessions).toBe(1);
  });

  /* ========================================
     3. Head Coach cancelled does not count
     ======================================== */
  it("3. Head Coach cancelled does not count", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "cancelled", coach_status: null, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.my_coaching_sessions).toBe(0);
  });

  /* ========================================
     4. Head Coach no_session does not count
     ======================================== */
  it("4. Head Coach no_session does not count", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "no_session", coach_status: null, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.my_coaching_sessions).toBe(0);
  });

  /* ========================================
     5. Head Coach holiday does not count
     ======================================== */
  it("5. Head Coach holiday does not count", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "holiday", coach_status: null, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.my_coaching_sessions).toBe(0);
  });

  /* ========================================
     6. Assistant Coach normal + present counts
     ======================================== */
  it("6. Assistant Coach normal + present counts", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session B", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: "present", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.my_coaching_sessions).toBe(1);
  });

  /* ========================================
     7. Assistant Coach normal + absent does not count
     ======================================== */
  it("7. Assistant Coach normal + absent does not count", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session B", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: "absent", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.my_coaching_sessions).toBe(0);
  });

  /* ========================================
     8. Assistant Coach cancelled clears coach_status and does not count
     ======================================== */
  it("8. Assistant Coach cancelled clears coach_status and does not count", async () => {
    mockState.sessions = [
      { id: 1, name: "Session B", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "14:00", end_time: "15:00" },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-05", location: "Pool B", session_status: "normal", coach_status: "present", created_at: "2026-10-05T10:00:00Z", updated_at: "2026-10-05T10:00:00Z", attendance_swimmers: [] },
    ];

    const request = new Request("http://localhost/api/attendance/100", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_status: "cancelled",
      }),
    });

    const response = await PATCH_ATTENDANCE(request, {
      params: Promise.resolve({ id: "100" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record.session_status).toBe("cancelled");
    expect(data.record.coach_status).toBeNull();
  });

  /* ========================================
     9. Assistant Coach no_session clears coach_status and does not count
     ======================================== */
  it("9. Assistant Coach no_session clears coach_status and does not count", async () => {
    mockState.sessions = [
      { id: 1, name: "Session B", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "14:00", end_time: "15:00" },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-05", location: "Pool B", session_status: "normal", coach_status: "present", created_at: "2026-10-05T10:00:00Z", updated_at: "2026-10-05T10:00:00Z", attendance_swimmers: [] },
    ];

    const request = new Request("http://localhost/api/attendance/100", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_status: "no_session",
      }),
    });

    const response = await PATCH_ATTENDANCE(request, {
      params: Promise.resolve({ id: "100" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record.session_status).toBe("no_session");
    expect(data.record.coach_status).toBeNull();
  });

  /* ========================================
     10. Assistant Coach holiday clears coach_status and does not count
     ======================================== */
  it("10. Assistant Coach holiday clears coach_status and does not count", async () => {
    mockState.sessions = [
      { id: 1, name: "Session B", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "14:00", end_time: "15:00" },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-05", location: "Pool B", session_status: "normal", coach_status: "present", created_at: "2026-10-05T10:00:00Z", updated_at: "2026-10-05T10:00:00Z", attendance_swimmers: [] },
    ];

    const request = new Request("http://localhost/api/attendance/100", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_status: "holiday",
      }),
    });

    const response = await PATCH_ATTENDANCE(request, {
      params: Promise.resolve({ id: "100" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record.session_status).toBe("holiday");
    expect(data.record.coach_status).toBeNull();
  });

  /* ========================================
     11. Head Coach UI has NO My Coaching Status input
     ======================================== */
  it("11. Head Coach attendance page does not contain My Coaching Status input", async () => {
    // This is a UI-level test - we verify the page source doesn't contain
    // the My Coaching Status section for Head Coach
    const fs = await import("fs");
    const path = await import("path");
    const pagePath = path.join(process.cwd(), "src/app/attendance/[id]/page.tsx");
    const pageSource = fs.readFileSync(pagePath, "utf-8");

    // Find the Head Coach section and verify it doesn't contain My Coaching Status
    // The Head Coach section is marked by {hasSwimmers && (
    // We need to find the section that starts with hasSwimmers and ends before the Assistant Coach section
    const headCoachSection = pageSource.match(
      /hasSwimmers && \([\s\S]*?Assistant Coach Attendance/,
    );
    expect(headCoachSection).not.toBeNull();
    expect(headCoachSection![0]).not.toContain("My Coaching Status");
  });

  /* ========================================
     12. Assistant Coach UI DOES have My Coaching Status input
     ======================================== */
  it("12. Assistant Coach attendance page contains My Coaching Status input", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const pagePath = path.join(process.cwd(), "src/app/attendance/[id]/page.tsx");
    const pageSource = fs.readFileSync(pagePath, "utf-8");

    // Verify the page contains My Coaching Status for Assistant Coach
    expect(pageSource).toContain("My Coaching Status");
    // Verify it's in the Assistant Coach section
    const assistantSection = pageSource.match(
      /!isHeadCoach && \([\s\S]*?My Coaching Status[\s\S]*?\}\)/,
    );
    expect(assistantSection).not.toBeNull();
  });

  /* ========================================
     13. Total Time Coached includes Head Coach normal duration
     ======================================== */
  it("13. Total Time Coached includes Head Coach normal duration", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "19:00", end_time: "20:00" }, // 60 min
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-05", location: null, session_status: "normal", coach_status: "present", created_at: "2026-10-05T10:00:00Z", updated_at: "2026-10-05T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total_minutes_coached).toBe(60);
    expect(data.total_time_coached).toBe("1h");
  });

  /* ========================================
     14. Total Time Coached includes Assistant Coach present duration
     ======================================== */
  it("14. Total Time Coached includes Assistant Coach present duration", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session B", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "17:30", end_time: "19:00" }, // 90 min
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-05", location: null, session_status: "normal", coach_status: "present", created_at: "2026-10-05T10:00:00Z", updated_at: "2026-10-05T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total_minutes_coached).toBe(90);
    expect(data.total_time_coached).toBe("1h 30m");
  });

  /* ========================================
     15. Total Time Coached excludes Assistant Coach absent
     ======================================== */
  it("15. Total Time Coached excludes Assistant Coach absent", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session B", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "17:30", end_time: "19:00" }, // 90 min
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-05", location: null, session_status: "normal", coach_status: "absent", created_at: "2026-10-05T10:00:00Z", updated_at: "2026-10-05T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total_minutes_coached).toBe(0);
    expect(data.total_time_coached).toBe("0m");
  });

  /* ========================================
     16. Archived historical Head Coach normal still counts
     ======================================== */
  it("16. Archived historical Head Coach normal still counts", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Archived Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: "present", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.my_coaching_sessions).toBe(1);
    // History should include the archived session
    expect(data.history).toHaveLength(1);
    expect(data.history[0].is_archived).toBe(true);
  });

  /* ========================================
     17. Home Sessions Completed still counts all normal occurrences independent of coach status
     ======================================== */
  it("17. Home Sessions Completed counts all normal occurrences independent of coach status", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
      { id: 2, name: "Session B", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: "present", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
      { id: 101, session_id: 2, attendance_date: "2026-09-02", location: null, session_status: "normal", coach_status: "absent", created_at: "2026-09-02T10:00:00Z", updated_at: "2026-09-02T10:00:00Z" },
      { id: 102, session_id: 1, attendance_date: "2026-09-03", location: null, session_status: "cancelled", coach_status: null, created_at: "2026-09-03T10:00:00Z", updated_at: "2026-09-03T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET_HOME(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Both normal occurrences count, regardless of coach_status
    expect(data.summary.sessions_completed).toBe(2);
  });

  /* ========================================
     18. Swimmer attendance calculations remain unchanged
     ======================================== */
  it("18. Swimmer attendance calculations remain unchanged", async () => {
    // This test verifies that swimmer attendance calculations are not affected
    // by the coaching record changes. The calculateAttendanceSummary function
    // should still work the same way.
    const { calculateAttendanceSummary } = await import("@/lib/attendance-helpers");

    const rows = [
      { attendance_status: "present", session_status: "normal" },
      { attendance_status: "absent", session_status: "normal" },
      { attendance_status: "present", session_status: "cancelled" },
    ];

    const summary = calculateAttendanceSummary(rows);

    // Cancelled sessions are excluded from swimmer calculations
    expect(summary.total_records).toBe(2);
    expect(summary.present_count).toBe(1);
    expect(summary.absent_count).toBe(1);
    expect(summary.sessions_completed).toBe(1);
  });
});

describe("calculateDurationMinutes", () => {
  it("calculates 60 minutes for 19:00-20:00", () => {
    expect(calculateDurationMinutes("19:00", "20:00")).toBe(60);
  });

  it("calculates 90 minutes for 17:30-19:00", () => {
    expect(calculateDurationMinutes("17:30", "19:00")).toBe(90);
  });

  it("calculates 45 minutes for 10:00-10:45", () => {
    expect(calculateDurationMinutes("10:00", "10:45")).toBe(45);
  });

  it("returns null for missing times", () => {
    expect(calculateDurationMinutes(null, "20:00")).toBeNull();
    expect(calculateDurationMinutes("19:00", null)).toBeNull();
    expect(calculateDurationMinutes(null, null)).toBeNull();
  });

  it("returns null for malformed times", () => {
    expect(calculateDurationMinutes("invalid", "20:00")).toBeNull();
    expect(calculateDurationMinutes("19:00", "invalid")).toBeNull();
  });

  it("handles midnight crossover", () => {
    expect(calculateDurationMinutes("23:00", "01:00")).toBe(120);
  });
});

describe("formatDuration", () => {
  it("formats 60 minutes as '1h'", () => {
    expect(formatDuration(60)).toBe("1h");
  });

  it("formats 90 minutes as '1h 30m'", () => {
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("formats 45 minutes as '45m'", () => {
    expect(formatDuration(45)).toBe("45m");
  });

  it("formats 0 minutes as '0m'", () => {
    expect(formatDuration(0)).toBe("0m");
  });
});
