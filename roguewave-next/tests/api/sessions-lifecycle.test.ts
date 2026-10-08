import { beforeEach, describe, it, expect, vi } from "vitest";
import { GET as GET_SESSIONS } from "@/app/api/sessions/route";
import { GET as GET_SESSION, PATCH as PATCH_SESSION, DELETE as DELETE_SESSION } from "@/app/api/sessions/[id]/route";
import { GET as GET_HOME } from "@/app/api/home/route";
import { generateCalendarOccurrences } from "@/lib/calendar-helpers";
import { getColomboToday } from "@/lib/attendance-helpers";

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

describe("V1 Session Lifecycle", () => {
  /* ========================================
     1. Active unused session can still be deleted
     ======================================== */
  it("1. active unused session can be deleted", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    const response = await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("Session deleted successfully.");
    expect(mockState.sessions.find((s) => s.id === 1)).toBeUndefined();
  });

  /* ========================================
     2. Active used session cannot be deleted
     ======================================== */
  it("2. active used session cannot be deleted (409)", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    const response = await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("This session has attendance history and cannot be deleted.");
    // Session still exists
    expect(mockState.sessions.find((s) => s.id === 1)).toBeDefined();
  });

  /* ========================================
     3. Active used session can be archived
     ======================================== */
  it("3. active used session can be archived via PATCH", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    const response = await PATCH_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const session = mockState.sessions.find((s) => s.id === 1);
    expect(session).toBeDefined();
    expect(session!.is_archived).toBe(true);
  });

  /* ========================================
     4. Archived session has is_archived = true
     ======================================== */
  it("4. archived session has is_archived = true", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];

    const request = new Request("http://localhost/api/sessions/1");
    const response = await GET_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.is_archived).toBe(true);
  });

  /* ========================================
     5. Archived session excluded from default GET /api/sessions
     ======================================== */
  it("5. archived session excluded from default GET /api/sessions", async () => {
    mockState.sessions = [
      { id: 1, name: "Active Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
      { id: 2, name: "Archived Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];

    const request = new Request("http://localhost/api/sessions");
    const response = await GET_SESSIONS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(1);
    expect(data[0].name).toBe("Active Session");
  });

  /* ========================================
     6. archived=true returns archived sessions
     ======================================== */
  it("6. archived=true returns archived sessions", async () => {
    mockState.sessions = [
      { id: 1, name: "Active Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
      { id: 2, name: "Archived Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];

    const request = new Request("http://localhost/api/sessions?archived=true");
    const response = await GET_SESSIONS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(2);
    expect(data[0].name).toBe("Archived Session");
  });

  /* ========================================
     7. Restore sets is_archived = false
     ======================================== */
  it("7. restore sets is_archived = false", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: false }),
    });

    const response = await PATCH_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const session = mockState.sessions.find((s) => s.id === 1);
    expect(session).toBeDefined();
    expect(session!.is_archived).toBe(false);
  });

  /* ========================================
     8. Restored session returns to active list
     ======================================== */
  it("8. restored session returns to active list", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];

    // Restore the session
    const patchRequest = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: false }),
    });

    await PATCH_SESSION(patchRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    // Now check default list
    const getRequest = new Request("http://localhost/api/sessions");
    const response = await GET_SESSIONS(getRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(1);
    expect(data[0].is_archived).toBe(false);
  });

  /* ========================================
     9. Archived session excluded from Home calendar
     ======================================== */
  it("9. archived session excluded from Home calendar", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Active Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
      { id: 2, name: "Archived Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
      { id: 2, session_id: 2, day_of_week: 1, start_time: "14:00", end_time: "15:00" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET_HOME(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Only active session should appear in calendar
    const archivedOccurrences = data.calendar.filter(
      (occ: { name: string }) => occ.name === "Archived Session",
    );
    expect(archivedOccurrences).toHaveLength(0);

    const activeOccurrences = data.calendar.filter(
      (occ: { name: string }) => occ.name === "Active Session",
    );
    expect(activeOccurrences.length).toBeGreaterThan(0);
  });

  /* ========================================
     10. Archived session excluded from upcoming_sessions
     ======================================== */
  it("10. archived session excluded from upcoming_sessions count", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Active Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
      { id: 2, name: "Archived Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
      { id: 2, session_id: 2, day_of_week: 1, start_time: "14:00", end_time: "15:00" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET_HOME(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // upcoming_sessions should only count active session occurrences (today or future)
    const todayStr = getColomboToday();
    const activeMondayCount = data.calendar.filter(
      (occ: { name: string; date: string }) => occ.name === "Active Session" && occ.date >= todayStr,
    ).length;
    expect(data.summary.upcoming_sessions).toBe(activeMondayCount);
  });

  /* ========================================
     11. Archived session historical attendance still counts in Sessions Completed
     ======================================== */
  it("11. archived session historical attendance still counts in Sessions Completed", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Archived Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
      { id: 101, session_id: 1, attendance_date: "2026-09-15", location: null, session_status: "normal", coach_status: null, created_at: "2026-09-15T10:00:00Z", updated_at: "2026-09-15T10:00:00Z" },
      { id: 102, session_id: 1, attendance_date: "2026-09-20", location: null, session_status: "cancelled", coach_status: null, created_at: "2026-09-20T10:00:00Z", updated_at: "2026-09-20T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/home");
    const response = await GET_HOME(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // sessions_completed counts all-time non-cancelled attendance_records
    // Archived status does NOT remove historical completed sessions
    expect(data.summary.sessions_completed).toBe(2);
  });

  /* ========================================
     12. Archived session remains represented in coaching history
     ======================================== */
  it("12. archived session remains represented in coaching history", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "Archived Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: true },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    // Import my-info route
    const { GET: GET_MY_INFO } = await import("@/app/api/my-info/route");
    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    // Coaching history should include the archived session's attendance
    expect(data.history).toHaveLength(1);
    expect(data.history[0].session_name).toBe("Archived Session");
    expect(data.history[0].is_archived).toBe(true);
  });

  /* ========================================
     13. Archiving does not delete session_swimmers
     ======================================== */
  it("13. archiving does not delete session_swimmers", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
      { id: 2, name: "Bob", level: "Intermediate" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 1, swimmer_id: 2 },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    // session_swimmers should still exist
    const remaining = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 1,
    );
    expect(remaining).toHaveLength(2);
  });

  /* ========================================
     14. Archiving does not delete attendance_records
     ======================================== */
  it("14. archiving does not delete attendance_records", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 1, attendance_date: "2026-10-08", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-08T10:00:00Z", updated_at: "2026-10-08T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    // attendance_records should still exist
    expect(mockState.attendance_records).toHaveLength(2);
    expect(mockState.attendance_records.find((a) => a.id === 100)).toBeDefined();
    expect(mockState.attendance_records.find((a) => a.id === 101)).toBeDefined();
  });

  /* ========================================
     15. Unrelated sessions remain unchanged
     ======================================== */
  it("15. unrelated sessions remain unchanged after archiving", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-10-15", start_time: "14:00", end_time: "15:00", is_archived: false },
      { id: 3, name: "Session C", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    // Session 1 is archived
    expect(mockState.sessions.find((s) => s.id === 1)!.is_archived).toBe(true);

    // Sessions 2 and 3 remain unchanged
    expect(mockState.sessions.find((s) => s.id === 2)!.is_archived).toBe(false);
    expect(mockState.sessions.find((s) => s.id === 3)!.is_archived).toBe(false);
    expect(mockState.sessions).toHaveLength(3);
  });
});

describe("generateCalendarOccurrences with archived sessions", () => {
  it("skips archived sessions", () => {
    const sessions = [
      {
        id: 1,
        name: "Active",
        role: "Head Coach",
        session_type: "recurring",
        default_location: null,
        session_date: null,
        start_time: null,
        end_time: null,
        is_archived: false,
        session_schedules: [
          { id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
        ],
        session_swimmers: [],
      },
      {
        id: 2,
        name: "Archived",
        role: "Head Coach",
        session_type: "recurring",
        default_location: null,
        session_date: null,
        start_time: null,
        end_time: null,
        is_archived: true,
        session_schedules: [
          { id: 2, day_of_week: 1, start_time: "14:00", end_time: "15:00" },
        ],
        session_swimmers: [],
      },
    ];

    const occurrences = generateCalendarOccurrences(sessions, 2026, 9, []);

    // Only active session should generate occurrences
    expect(occurrences.length).toBeGreaterThan(0);
    for (const occ of occurrences) {
      expect(occ.name).toBe("Active");
    }
  });
});
