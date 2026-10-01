import { beforeEach, describe, it, expect, vi } from "vitest";
import { DELETE as DELETE_SWIMMER } from "@/app/api/swimmers/[id]/route";

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

describe("DELETE /api/swimmers/[id]", () => {
  it("1. Valid swimmer DELETE returns 200", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    const response = await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("Swimmer deleted successfully.");
  });

  it("2. Swimmer row is removed from swimmers table", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
      { id: 2, name: "Bob", level: "Intermediate" },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(mockState.swimmers.find((s) => s.id === 1)).toBeUndefined();
    expect(mockState.swimmers.find((s) => s.id === 2)).toBeDefined();
  });

  it("3. session_swimmers rows for deleted swimmer are removed (CASCADE)", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 2, swimmer_id: 1 },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    const remaining = mockState.session_swimmers.filter(
      (ss) => ss.swimmer_id === 1,
    );
    expect(remaining).toHaveLength(0);
  });

  it("4. session_swimmers rows for other swimmers remain untouched", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
      { id: 2, name: "Bob", level: "Intermediate" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 1, swimmer_id: 2 },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    const bobAssignments = mockState.session_swimmers.filter(
      (ss) => ss.swimmer_id === 2,
    );
    expect(bobAssignments).toHaveLength(1);
    expect(bobAssignments[0].session_id).toBe(1);
  });

  it("5. attendance_swimmers rows are NOT deleted", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
    ];
    mockState.attendance_swimmers = [
      { id: 100, attendance_id: 1, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(mockState.attendance_swimmers).toHaveLength(1);
  });

  it("6. attendance_swimmers.swimmer_id becomes null (SET NULL)", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
    ];
    mockState.attendance_swimmers = [
      { id: 100, attendance_id: 1, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(mockState.attendance_swimmers[0].swimmer_id).toBeNull();
  });

  it("7. swimmer_name remains unchanged after deletion", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
    ];
    mockState.attendance_swimmers = [
      { id: 100, attendance_id: 1, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(mockState.attendance_swimmers[0].swimmer_name).toBe("Alice");
  });

  it("8. Unrelated attendance_swimmers rows remain untouched", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
      { id: 2, name: "Bob", level: "Intermediate" },
    ];
    mockState.attendance_swimmers = [
      { id: 100, attendance_id: 1, swimmer_id: 1, swimmer_name: "Alice", attendance_status: "present" },
      { id: 101, attendance_id: 1, swimmer_id: 2, swimmer_name: "Bob", attendance_status: "absent" },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    const bobRow = mockState.attendance_swimmers.find((a) => a.id === 101);
    expect(bobRow).toBeDefined();
    expect(bobRow!.swimmer_id).toBe(2);
    expect(bobRow!.swimmer_name).toBe("Bob");
    expect(bobRow!.attendance_status).toBe("absent");
  });

  it("9. Deleting swimmer assigned to multiple sessions removes all assignments", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-03-15", start_time: "14:00", end_time: "15:00" },
      { id: 3, name: "Session C", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 2, swimmer_id: 1 },
      { session_id: 3, swimmer_id: 1 },
    ];

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    const remaining = mockState.session_swimmers.filter(
      (ss) => ss.swimmer_id === 1,
    );
    expect(remaining).toHaveLength(0);
    expect(mockState.session_swimmers).toHaveLength(0);
  });

  it("10. Invalid swimmer ID returns 400", async () => {
    const request = new Request("http://localhost/api/swimmers/abc", {
      method: "DELETE",
    });

    const response = await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid swimmer ID.");
  });

  it("11. Database delete error returns 500", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
    ];
    mockState.simulateError = true;

    const request = new Request("http://localhost/api/swimmers/1", {
      method: "DELETE",
    });

    const response = await DELETE_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Database connection failed");
  });
});
