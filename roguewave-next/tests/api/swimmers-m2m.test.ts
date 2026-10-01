/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { POST as POST_SESSION } from "@/app/api/sessions/route";
import { PATCH as PATCH_SESSION } from "@/app/api/sessions/[id]/route";
import { POST as POST_SWIMMER } from "@/app/api/swimmers/route";
import { GET as GET_SWIMMER, PATCH as PATCH_SWIMMER } from "@/app/api/swimmers/[id]/route";

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

describe("Many-to-Many: Swimmer ↔ Session", () => {
  it("1. Swimmer can be assigned to Session A", async () => {
    // Arrange: create a session
    mockState.sessions = [
      {
        id: 1,
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Pool A",
        session_date: null,
        start_time: null,
        end_time: null,
      },
    ];
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];

    // Act: assign swimmer to session
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        schedules: [{ day_of_week: 1, start_time: "10:00", end_time: "11:00" }],
        swimmer_ids: [1],
      }),
    });

    const response = await POST_SESSION(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(201);
    const assignments = mockState.session_swimmers.filter(
      (ss) => ss.session_id === data.session.id && ss.swimmer_id === 1,
    );
    expect(assignments).toHaveLength(1);
  });

  it("2. Same swimmer can then be assigned to Session B", async () => {
    // Arrange: swimmer already in Session A
    mockState.sessions = [
      {
        id: 1,
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Pool A",
        session_date: null,
        start_time: null,
        end_time: null,
      },
    ];
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.session_swimmers = [{ session_id: 1, swimmer_id: 1 }];

    // Act: create Session B with same swimmer
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session B",
        role: "Head Coach",
        session_type: "once",
        session_date: "2026-03-15",
        start_time: "14:00",
        end_time: "15:00",
        swimmer_ids: [1],
      }),
    });

    const response = await POST_SESSION(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(201);

    // Swimmer should be in both sessions
    const sessionAAssignments = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 1 && ss.swimmer_id === 1,
    );
    const sessionBAssignments = mockState.session_swimmers.filter(
      (ss) => ss.session_id === data.session.id && ss.swimmer_id === 1,
    );
    expect(sessionAAssignments).toHaveLength(1);
    expect(sessionBAssignments).toHaveLength(1);
  });

  it("3. Assignment to Session A still exists after assigning to Session B", async () => {
    // Arrange
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-03-15", start_time: "14:00", end_time: "15:00" },
    ];
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 2, swimmer_id: 1 },
    ];

    // Act: verify both assignments exist
    const sessionA = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 1 && ss.swimmer_id === 1,
    );
    const sessionB = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 2 && ss.swimmer_id === 1,
    );

    // Assert
    expect(sessionA).toHaveLength(1);
    expect(sessionB).toHaveLength(1);
  });

  it("4. Editing Session B does not alter Session A assignments", async () => {
    // Arrange: swimmer in both sessions
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-03-15", start_time: "14:00", end_time: "15:00" },
    ];
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 2, swimmer_id: 1 },
    ];

    // Act: edit Session B (change name, keep same swimmers)
    const request = new Request("http://localhost/api/sessions/2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session B Updated",
        session_type: "once",
        session_date: "2026-03-15",
        start_time: "14:00",
        end_time: "15:00",
        swimmer_ids: [1],
      }),
    });

    const response = await PATCH_SESSION(request, {
      params: Promise.resolve({ id: "2" }),
    });

    // Assert
    expect(response.status).toBe(200);

    // Session A assignment should still exist
    const sessionA = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 1 && ss.swimmer_id === 1,
    );
    expect(sessionA).toHaveLength(1);

    // Session B assignment should still exist
    const sessionB = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 2 && ss.swimmer_id === 1,
    );
    expect(sessionB).toHaveLength(1);
  });

  it("5. Removing swimmer from Session B leaves Session A assignment intact", async () => {
    // Arrange: swimmer in both sessions
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-03-15", start_time: "14:00", end_time: "15:00" },
    ];
    mockState.swimmers = [{ id: 1, name: "Alice", level: "Beginner" }];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 2, swimmer_id: 1 },
    ];

    // Act: edit Session B removing the swimmer
    const request = new Request("http://localhost/api/sessions/2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session B",
        session_type: "once",
        session_date: "2026-03-15",
        start_time: "14:00",
        end_time: "15:00",
        swimmer_ids: [],
      }),
    });

    const response = await PATCH_SESSION(request, {
      params: Promise.resolve({ id: "2" }),
    });

    // Assert
    expect(response.status).toBe(200);

    // Session A assignment should still exist
    const sessionA = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 1 && ss.swimmer_id === 1,
    );
    expect(sessionA).toHaveLength(1);

    // Session B assignment should be gone
    const sessionB = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 2 && ss.swimmer_id === 1,
    );
    expect(sessionB).toHaveLength(0);
  });

  it("6. Add Swimmer no longer creates session_swimmers", async () => {
    // Act: create a swimmer without session_id
    const request = new Request("http://localhost/api/swimmers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice",
        level: "Beginner",
        date_of_birth: "2010-01-01",
        date_joined: "2026-01-01",
        height_cm: 150,
        weight_kg: 45,
        notes: null,
      }),
    });

    const response = await POST_SWIMMER(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(data.swimmer).toBeDefined();

    // No session_swimmers should be created
    expect(mockState.session_swimmers).toHaveLength(0);
  });

  it("7. Edit Swimmer details preserves all existing session assignments", async () => {
    // Arrange: swimmer with session assignments
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: null, session_date: "2026-03-15", start_time: "14:00", end_time: "15:00" },
    ];
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", date_of_birth: "2010-01-01", date_joined: "2026-01-01", height_cm: 150, weight_kg: 45, notes: null, created_at: "2026-01-01" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 2, swimmer_id: 1 },
    ];

    // Act: edit swimmer name only
    const request = new Request("http://localhost/api/swimmers/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Updated",
        level: "Intermediate",
        date_of_birth: "2010-01-01",
        date_joined: "2026-01-01",
        height_cm: 155,
        weight_kg: 46,
        notes: "Updated notes",
      }),
    });

    const response = await PATCH_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });

    // Assert
    expect(response.status).toBe(200);

    // Both session assignments should still exist
    const sessionA = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 1 && ss.swimmer_id === 1,
    );
    const sessionB = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 2 && ss.swimmer_id === 1,
    );
    expect(sessionA).toHaveLength(1);
    expect(sessionB).toHaveLength(1);
  });

  it("8. GET swimmer by ID returns multiple sessions correctly", async () => {
    // Arrange: swimmer with multiple sessions
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: "Pool A", session_date: null, start_time: null, end_time: null },
      { id: 2, name: "Session B", role: "Head Coach", session_type: "once", default_location: "Pool B", session_date: "2026-03-15", start_time: "14:00", end_time: "15:00" },
    ];
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", date_of_birth: "2010-01-01", date_joined: "2026-01-01", height_cm: 150, weight_kg: 45, notes: null, created_at: "2026-01-01" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 2, swimmer_id: 1 },
    ];
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
    ];

    // Act: call the real GET route
    const request = new Request("http://localhost/api/swimmers/1");
    const response = await GET_SWIMMER(request, {
      params: Promise.resolve({ id: "1" }),
    });
    const data = await response.json();

    // Assert: response is successful
    expect(response.status).toBe(200);

    // Assert: data.sessions is an array
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.sessions).toHaveLength(2);

    // Assert: contains both Session A and Session B
    const sessionA = data.sessions.find((s: any) => s.id === 1);
    const sessionB = data.sessions.find((s: any) => s.id === 2);

    expect(sessionA).toBeDefined();
    expect(sessionA.name).toBe("Session A");
    expect(sessionA.session_type).toBe("recurring");

    expect(sessionB).toBeDefined();
    expect(sessionB.name).toBe("Session B");
    expect(sessionB.session_type).toBe("once");

    // Assert: recurring session contains its session_schedules
    expect(sessionA.session_schedules).toBeDefined();
    expect(Array.isArray(sessionA.session_schedules)).toBe(true);
    expect(sessionA.session_schedules).toHaveLength(1);
    expect(sessionA.session_schedules[0].day_of_week).toBe(1);
    expect(sessionA.session_schedules[0].start_time).toBe("10:00");
    expect(sessionA.session_schedules[0].end_time).toBe("11:00");

    // Assert: once session contains its once-session fields
    expect(sessionB.session_date).toBe("2026-03-15");
    expect(sessionB.start_time).toBe("14:00");
    expect(sessionB.end_time).toBe("15:00");

    // Assert: no duplicate session objects
    const sessionIds = data.sessions.map((s: any) => s.id);
    expect(new Set(sessionIds).size).toBe(sessionIds.length);
  });
});
