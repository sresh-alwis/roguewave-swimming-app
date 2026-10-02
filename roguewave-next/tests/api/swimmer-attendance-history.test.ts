import { beforeEach, describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/swimmers/[id]/attendance-history/route";
import { calculateAttendanceSummary } from "@/lib/attendance-helpers";

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

describe("GET /api/swimmers/[id]/attendance-history", () => {
  it("1. returns real history records for swimmer", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: "Pool A", session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: "Pool A", session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.records).toHaveLength(1);
    expect(data.records[0].session_name).toBe("Session A");
    expect(data.records[0].attendance_status).toBe("present");
  });

  it("2. present count correct", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 10, attendance_date: "2026-10-02", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
      { id: 102, session_id: 10, attendance_date: "2026-10-03", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
      { id: 1001, attendance_id: 101, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-02T10:00:00Z" },
      { id: 1002, attendance_id: 102, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "absent", created_at: "2026-10-03T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(data.summary.present_count).toBe(2);
  });

  it("3. absent count correct", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 10, attendance_date: "2026-10-02", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
      { id: 1001, attendance_id: 101, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "absent", created_at: "2026-10-02T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(data.summary.absent_count).toBe(1);
  });

  it("4. attendance percentage correct", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 10, attendance_date: "2026-10-02", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
      { id: 102, session_id: 10, attendance_date: "2026-10-03", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:00:00Z" },
      { id: 103, session_id: 10, attendance_date: "2026-10-04", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-04T10:00:00Z", updated_at: "2026-10-04T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
      { id: 1001, attendance_id: 101, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-02T10:00:00Z" },
      { id: 1002, attendance_id: 102, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-03T10:00:00Z" },
      { id: 1003, attendance_id: 103, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "absent", created_at: "2026-10-04T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(data.summary.attendance_percentage).toBe(75);
  });

  it("5. zero records returns 0%", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.attendance_percentage).toBe(0);
    expect(data.summary.total_records).toBe(0);
    expect(data.records).toHaveLength(0);
  });

  it("6. sessions_completed equals present count", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 10, attendance_date: "2026-10-02", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
      { id: 1001, attendance_id: 101, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "absent", created_at: "2026-10-02T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(data.summary.sessions_completed).toBe(1);
    expect(data.summary.sessions_completed).toBe(data.summary.present_count);
  });

  it("7. cancelled sessions do not inflate calculations", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 10, attendance_date: "2026-10-02", location: null, session_status: "cancelled", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
      { id: 1001, attendance_id: 101, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-02T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    // Cancelled session should be excluded from calculations
    expect(data.summary.total_records).toBe(1);
    expect(data.summary.present_count).toBe(1);
    expect(data.summary.sessions_completed).toBe(1);
  });

  it("8. records sorted newest first", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 10, attendance_date: "2026-10-03", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:00:00Z" },
      { id: 102, session_id: 10, attendance_date: "2026-10-02", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
      { id: 1001, attendance_id: 101, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-03T10:00:00Z" },
      { id: 1002, attendance_id: 102, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "absent", created_at: "2026-10-02T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(data.records[0].attendance_date).toBe("2026-10-03");
    expect(data.records[1].attendance_date).toBe("2026-10-02");
    expect(data.records[2].attendance_date).toBe("2026-10-01");
  });

  it("9. session name included in response", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "RogueWave Masters", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(data.records[0].session_name).toBe("RogueWave Masters");
  });

  it("10. location included in response", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: "Pool A", session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: "President's College Pool", session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(data.records[0].location).toBe("President's College Pool");
  });

  it("11. missing swimmer returns 404", async () => {
    mockState.swimmers = [];

    const request = new Request("http://localhost/api/swimmers/999/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "999" }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Swimmer not found.");
  });

  it("12. no attendance returns empty records with zero summary", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.records).toHaveLength(0);
    expect(data.summary.total_records).toBe(0);
    expect(data.summary.present_count).toBe(0);
    expect(data.summary.absent_count).toBe(0);
    expect(data.summary.attendance_percentage).toBe(0);
    expect(data.summary.sessions_completed).toBe(0);
  });

  it("13. null swimmer_id row does not crash normalization", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];
    // Historical row with null swimmer_id (e.g., after swimmer deletion)
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: null, swimmer_name: "Deleted Swimmer", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    // This should not crash - the null swimmer_id row simply won't match swimmer_id=1
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    // The null swimmer_id row should not appear in this swimmer's history
    expect(data.records).toHaveLength(0);
  });

  it("14. attendance record includes correct session info and status", async () => {
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.sessions = [
      { id: 10, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 10, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 1000, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice Snapshot", attendance_status: "present", created_at: "2026-10-01T10:00:00Z" },
    ];

    const request = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.records).toHaveLength(1);
    expect(data.records[0].attendance_status).toBe("present");
    expect(data.records[0].session_name).toBe("Session A");
    expect(data.records[0].session_status).toBe("normal");
  });
});

describe("calculateAttendanceSummary", () => {
  it("calculates correct summary for mixed data", () => {
    const rows = [
      { attendance_status: "present", session_status: "normal" },
      { attendance_status: "present", session_status: "normal" },
      { attendance_status: "absent", session_status: "normal" },
    ];

    const summary = calculateAttendanceSummary(rows);

    expect(summary.total_records).toBe(3);
    expect(summary.present_count).toBe(2);
    expect(summary.absent_count).toBe(1);
    expect(summary.attendance_percentage).toBe(67);
    expect(summary.sessions_completed).toBe(2);
  });

  it("returns 0% for empty array", () => {
    const summary = calculateAttendanceSummary([]);

    expect(summary.total_records).toBe(0);
    expect(summary.present_count).toBe(0);
    expect(summary.absent_count).toBe(0);
    expect(summary.attendance_percentage).toBe(0);
    expect(summary.sessions_completed).toBe(0);
  });

  it("excludes cancelled sessions", () => {
    const rows = [
      { attendance_status: "present", session_status: "normal" },
      { attendance_status: "present", session_status: "cancelled" },
      { attendance_status: "absent", session_status: "cancelled" },
    ];

    const summary = calculateAttendanceSummary(rows);

    expect(summary.total_records).toBe(1);
    expect(summary.present_count).toBe(1);
    expect(summary.absent_count).toBe(0);
    expect(summary.attendance_percentage).toBe(100);
    expect(summary.sessions_completed).toBe(1);
  });

  it("handles all absent", () => {
    const rows = [
      { attendance_status: "absent", session_status: "normal" },
      { attendance_status: "absent", session_status: "normal" },
    ];

    const summary = calculateAttendanceSummary(rows);

    expect(summary.total_records).toBe(2);
    expect(summary.present_count).toBe(0);
    expect(summary.absent_count).toBe(2);
    expect(summary.attendance_percentage).toBe(0);
    expect(summary.sessions_completed).toBe(0);
  });
});
