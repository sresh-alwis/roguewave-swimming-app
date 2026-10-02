import { beforeEach, describe, it, expect, vi } from "vitest";
import { DELETE as DELETE_SESSION } from "@/app/api/sessions/[id]/route";

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

describe("DELETE /api/sessions/[id]", () => {
  it("1. delete unused session succeeds", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
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
  });

  it("2. unused session row removed", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-03-15", start_time: "14:00", end_time: "15:00" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(mockState.sessions.find((s) => s.id === 1)).toBeUndefined();
    expect(mockState.sessions.find((s) => s.id === 2)).toBeDefined();
  });

  it("3. schedules cascade in mock", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_schedules = [
      { id: 10, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
      { id: 11, session_id: 1, day_of_week: 3, start_time: "14:00", end_time: "15:00" },
      { id: 12, session_id: 2, day_of_week: 2, start_time: "09:00", end_time: "10:00" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    const remaining = mockState.session_schedules.filter(
      (s) => s.session_id === 1,
    );
    expect(remaining).toHaveLength(0);
    // Other session's schedules remain
    expect(mockState.session_schedules.find((s) => s.id === 12)).toBeDefined();
  });

  it("4. session_swimmers cascade in mock", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
      { id: 2, name: "Bob", level: "Intermediate" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 1, swimmer_id: 2 },
      { session_id: 2, swimmer_id: 1 },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    const remaining = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 1,
    );
    expect(remaining).toHaveLength(0);
    // Other session's swimmers remain
    expect(mockState.session_swimmers.find((ss) => ss.session_id === 2)).toBeDefined();
  });

  it("5. session with attendance history returns 409", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, date: "2026-03-01" },
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
  });

  it("6. session with attendance history remains", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, date: "2026-03-01" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(mockState.sessions.find((s) => s.id === 1)).toBeDefined();
  });

  it("7. attendance_records remain", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, date: "2026-03-01" },
      { id: 101, session_id: 1, date: "2026-03-08" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(mockState.attendance_records).toHaveLength(2);
    expect(mockState.attendance_records.find((a) => a.id === 100)).toBeDefined();
    expect(mockState.attendance_records.find((a) => a.id === 101)).toBeDefined();
  });

  it("8. unrelated sessions remain untouched", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-03-15", start_time: "14:00", end_time: "15:00" },
      { id: 3, name: "Session C", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, date: "2026-03-01" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(mockState.sessions.find((s) => s.id === 2)).toBeDefined();
    expect(mockState.sessions.find((s) => s.id === 3)).toBeDefined();
    expect(mockState.sessions).toHaveLength(3);
  });

  it("9. invalid session ID returns 400", async () => {
    const request = new Request("http://localhost/api/sessions/abc", {
      method: "DELETE",
    });

    const response = await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid session ID.");
  });

  it("10. DB error returns 500", async () => {
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.simulateError = true;

    const request = new Request("http://localhost/api/sessions/1", {
      method: "DELETE",
    });

    const response = await DELETE_SESSION(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Database connection failed");
  });
});
