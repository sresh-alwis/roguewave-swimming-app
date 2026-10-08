/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { GET as GET_SWIMMERS } from "@/app/api/swimmers/route";
import { GET as GET_SWIMMER, PATCH as PATCH_SWIMMER, DELETE as DELETE_SWIMMER } from "@/app/api/swimmers/[id]/route";
import { GET as GET_ATTENDANCE_HISTORY } from "@/app/api/swimmers/[id]/attendance-history/route";
import { GET as GET_HOME } from "@/app/api/home/route";
import { GET as GET_MY_INFO } from "@/app/api/my-info/route";

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

describe("V1 Swimmer Lifecycle", () => {
  /* ========================================
     1. Active swimmer appears in default GET
     ======================================== */
  it("1. active swimmer appears in default GET", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];

    const request = new Request("http://localhost/api/swimmers");
    const response = await GET_SWIMMERS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(1);
    expect(data[0].name).toBe("Alice");
  });

  /* ========================================
     2. Archived swimmer excluded from default GET
     ======================================== */
  it("2. archived swimmer excluded from default GET", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
      { id: 2, name: "Bob", level: "Intermediate", is_archived: true },
    ];

    const request = new Request("http://localhost/api/swimmers");
    const response = await GET_SWIMMERS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(1);
    expect(data[0].name).toBe("Alice");
  });

  /* ========================================
     3. archived=true returns archived swimmers
     ======================================== */
  it("3. archived=true returns archived swimmers", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
      { id: 2, name: "Bob", level: "Intermediate", is_archived: true },
    ];

    const request = new Request("http://localhost/api/swimmers?archived=true");
    const response = await GET_SWIMMERS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(2);
    expect(data[0].name).toBe("Bob");
  });

  /* ========================================
     4. Archive sets is_archived = true
     ======================================== */
  it("4. archive sets is_archived = true", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    const response = await PATCH_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const swimmer = mockState.swimmers.find((s) => s.id === 1);
    expect(swimmer).toBeDefined();
    expect(swimmer!.is_archived).toBe(true);
  });

  /* ========================================
     5. Restore sets is_archived = false
     ======================================== */
  it("5. restore sets is_archived = false", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: true },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: false }),
    });

    const response = await PATCH_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const swimmer = mockState.swimmers.find((s) => s.id === 1);
    expect(swimmer).toBeDefined();
    expect(swimmer!.is_archived).toBe(false);
  });

  /* ========================================
     6. Restored swimmer returns to active list
     ======================================== */
  it("6. restored swimmer returns to active list", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: true },
    ];

    // Restore the swimmer
    const patchRequest = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: false }),
    });

    await PATCH_SWIMMER(patchRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    // Now check default list
    const getRequest = new Request("http://localhost/api/swimmers");
    const response = await GET_SWIMMERS(getRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(1);
    expect(data[0].is_archived).toBe(false);
  });

  /* ========================================
     7. Archived swimmer excluded from Add/Edit Session swimmer options
     ======================================== */
  it("7. archived swimmer excluded from Add/Edit Session swimmer options", async () => {
    mockState.swimmers = [
      { id: 1, name: "Active Swimmer", level: "Beginner", is_archived: false },
      { id: 2, name: "Archived Swimmer", level: "Intermediate", is_archived: true },
    ];

    // Add/Edit Session pages fetch /api/swimmers (default = active only)
    const request = new Request("http://localhost/api/swimmers");
    const response = await GET_SWIMMERS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Active Swimmer");
    // Archived swimmer should not appear in session assignment options
    const archivedInList = data.find((s: any) => s.name === "Archived Swimmer");
    expect(archivedInList).toBeUndefined();
  });

  /* ========================================
     8. Archived swimmer excluded from future attendance roster
     ======================================== */
  it("8. archived swimmer excluded from future attendance roster", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
    ];

    // Archive the swimmer
    const request = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    // session_swimmers links should be removed
    const remaining = mockState.session_swimmers.filter(
      (ss) => ss.swimmer_id === 1,
    );
    expect(remaining).toHaveLength(0);
  });

  /* ========================================
     9. Historical attendance remains after archive
     ======================================== */
  it("9. historical attendance remains after archive", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];
    mockState.attendance_swimmers = [
      { id: 100, attendance_id: 1, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
      { id: 101, attendance_id: 2, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "absent" },
    ];

    // Archive the swimmer
    const request = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    // attendance_swimmers rows should still exist
    expect(mockState.attendance_swimmers).toHaveLength(2);
    expect(mockState.attendance_swimmers.find((a) => a.id === 100)).toBeDefined();
    expect(mockState.attendance_swimmers.find((a) => a.id === 101)).toBeDefined();
  });

  /* ========================================
     10. Sessions Completed remains unchanged after archive
     ======================================== */
  it("10. Sessions Completed remains unchanged after archive", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 1, attendance_date: "2026-10-02", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
      { id: 102, session_id: 1, attendance_date: "2026-10-03", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 200, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
      { id: 201, attendance_id: 101, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
      { id: 202, attendance_id: 102, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "absent" },
    ];

    // Get sessionsCompleted before archive
    const getBefore = new Request("http://localhost/api/swimmers/1");
    const responseBefore = await GET_SWIMMER(getBefore, {
      params: Promise.resolve({ id: "1" }),
    });
    const dataBefore = await responseBefore.json();
    expect(dataBefore.sessionsCompleted).toBe(2);

    // Archive the swimmer
    const patchRequest = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SWIMMER(patchRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    // Get sessionsCompleted after archive
    const getAfter = new Request("http://localhost/api/swimmers/1");
    const responseAfter = await GET_SWIMMER(getAfter, {
      params: Promise.resolve({ id: "1" }),
    });
    const dataAfter = await responseAfter.json();
    expect(dataAfter.sessionsCompleted).toBe(2);
  });

  /* ========================================
     11. Attendance percentage remains unchanged after archive
     ======================================== */
  it("11. attendance percentage remains unchanged after archive", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
      { id: 101, session_id: 1, attendance_date: "2026-10-02", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-02T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" },
      { id: 102, session_id: 1, attendance_date: "2026-10-03", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 200, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
      { id: 201, attendance_id: 101, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
      { id: 202, attendance_id: 102, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "absent" },
    ];

    // Get attendance percentage before archive
    const getBefore = new Request("http://localhost/api/swimmers/1/attendance-history");
    const responseBefore = await GET_ATTENDANCE_HISTORY(getBefore, {
      params: Promise.resolve({ id: "1" }),
    });
    const dataBefore = await responseBefore.json();
    expect(dataBefore.summary.attendance_percentage).toBe(67); // 2/3 = 66.67% rounded to 67%

    // Archive the swimmer
    const patchRequest = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SWIMMER(patchRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    // Get attendance percentage after archive
    const getAfter = new Request("http://localhost/api/swimmers/1/attendance-history");
    const responseAfter = await GET_ATTENDANCE_HISTORY(getAfter, {
      params: Promise.resolve({ id: "1" }),
    });
    const dataAfter = await responseAfter.json();
    expect(dataAfter.summary.attendance_percentage).toBe(67);
  });

  /* ========================================
     12. Home Total Swimmers counts active only
     ======================================== */
  it("12. Home Total Swimmers counts active only", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
      { id: 2, name: "Bob", level: "Intermediate", is_archived: false },
      { id: 3, name: "Charlie", level: "Advanced", is_archived: true },
    ];
    mockState.sessions = [];

    const request = new Request("http://localhost/api/home");
    const response = await GET_HOME(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.total_swimmers).toBe(2);
  });

  /* ========================================
     13. My Info Current Swimmers counts active only
     ======================================== */
  it("13. My Info Current Swimmers counts active only", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
      { id: 2, name: "Bob", level: "Intermediate", is_archived: false },
      { id: 3, name: "Charlie", level: "Advanced", is_archived: true },
    ];
    mockState.sessions = [];
    mockState.attendance_records = [];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.current_swimmers).toBe(2);
  });

  /* ========================================
     14. Archived profile still loads
     ======================================== */
  it("14. archived profile still loads", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: true },
    ];

    const request = new Request("http://localhost/api/swimmers/1");
    const response = await GET_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe(1);
    expect(data.name).toBe("Alice");
  });

  /* ========================================
     15. Archived profile shows Archived state
     ======================================== */
  it("15. archived profile shows Archived state", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: true },
    ];

    const request = new Request("http://localhost/api/swimmers/1");
    const response = await GET_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.is_archived).toBe(true);
  });

  /* ========================================
     16. Restore preserves historical attendance
     ======================================== */
  it("16. restore preserves historical attendance", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 200, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
    ];

    // Archive the swimmer
    const archiveRequest = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SWIMMER(archiveRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    // Restore the swimmer
    const restoreRequest = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: false }),
    });

    await PATCH_SWIMMER(restoreRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    // Verify attendance history is preserved
    const getHistory = new Request("http://localhost/api/swimmers/1/attendance-history");
    const response = await GET_ATTENDANCE_HISTORY(getHistory, {
      params: Promise.resolve({ id: "1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.present_count).toBe(1);
    expect(data.summary.sessions_completed).toBe(1);
    expect(data.records).toHaveLength(1);
    expect(data.records[0].attendance_status).toBe("present");
  });

  /* ========================================
     17. Unrelated swimmers remain unchanged
     ======================================== */
  it("17. unrelated swimmers remain unchanged after archiving", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
      { id: 2, name: "Bob", level: "Intermediate", is_archived: false },
      { id: 3, name: "Charlie", level: "Advanced", is_archived: false },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 1, swimmer_id: 2 },
      { session_id: 1, swimmer_id: 3 },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-10-01", location: null, session_status: "normal", coach_status: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" },
    ];
    mockState.attendance_swimmers = [
      { id: 200, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
      { id: 201, attendance_id: 100, swimmer_id: 2, swimmer_name: "Bob", attendance_status: "present" },
      { id: 202, attendance_id: 100, swimmer_id: 3, swimmer_name: "Charlie", attendance_status: "absent" },
    ];

    // Archive Alice
    const request = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    await PATCH_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    // Alice is archived
    expect(mockState.swimmers.find((s) => s.id === 1)!.is_archived).toBe(true);

    // Bob and Charlie remain unchanged
    expect(mockState.swimmers.find((s) => s.id === 2)!.is_archived).toBe(false);
    expect(mockState.swimmers.find((s) => s.id === 3)!.is_archived).toBe(false);

    // Bob and Charlie still assigned to Session A
    const bobAssignment = mockState.session_swimmers.find(
      (ss) => ss.session_id === 1 && ss.swimmer_id === 2,
    );
    const charlieAssignment = mockState.session_swimmers.find(
      (ss) => ss.session_id === 1 && ss.swimmer_id === 3,
    );
    expect(bobAssignment).toBeDefined();
    expect(charlieAssignment).toBeDefined();

    // All attendance history remains
    expect(mockState.attendance_swimmers).toHaveLength(3);
    expect(mockState.attendance_swimmers.find((a) => a.id === 200)).toBeDefined();
    expect(mockState.attendance_swimmers.find((a) => a.id === 201)).toBeDefined();
    expect(mockState.attendance_swimmers.find((a) => a.id === 202)).toBeDefined();
  });

  /* ========================================
     18. Safe-delete rule protects swimmers with attendance history
     ======================================== */
  it("18. safe-delete rule protects swimmers with attendance history", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];
    mockState.attendance_swimmers = [
      { id: 200, attendance_id: 100, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    const response = await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("This swimmer has attendance history and cannot be deleted.");

    // Swimmer still exists
    expect(mockState.swimmers.find((s) => s.id === 1)).toBeDefined();
  });
});
