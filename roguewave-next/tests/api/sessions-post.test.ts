/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { POST, GET } from "@/app/api/sessions/route";
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

describe("POST /api/sessions - New Sessions Stay Separate", () => {
  it("creates a new session with a different ID from existing sessions", async () => {
    // Arrange: existing session
    mockState.sessions = [
      {
        id: 1,
        name: "RogueWave Masters Learn to Swim",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Pool A",
        session_date: null,
        start_time: null,
        end_time: null,
      },
    ];
    mockState.session_schedules = [
      {
        id: 1,
        session_id: 1,
        day_of_week: 1,
        start_time: "10:00",
        end_time: "11:00",
      },
    ];
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
      { id: 2, name: "Bob", level: "Intermediate" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 1, swimmer_id: 2 },
    ];

    // Act: POST a second session
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Gold March Academy",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Pool B",
        schedules: [
          { day_of_week: 3, start_time: "14:00", end_time: "15:00" },
        ],
        swimmer_ids: [1, 2],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Assert: POST succeeds
    expect(response.status).toBe(201);
    expect(data.session).toBeDefined();
    expect(data.session.name).toBe("Gold March Academy");

    // Assert: second session receives a different ID
    expect(data.session.id).not.toBe(1);
    expect(data.session.id).toBeGreaterThan(1);

    // Assert: original session remains unchanged
    const originalSession = mockState.sessions.find((s) => s.id === 1);
    expect(originalSession).toBeDefined();
    expect(originalSession!.name).toBe("RogueWave Masters Learn to Swim");
    expect(originalSession!.session_type).toBe("recurring");

    // Assert: schedules for the new session use the new session ID
    const newSessionSchedules = mockState.session_schedules.filter(
      (s) => s.session_id === data.session.id,
    );
    expect(newSessionSchedules).toHaveLength(1);
    expect(newSessionSchedules[0].day_of_week).toBe(3);
    expect(newSessionSchedules[0].start_time).toBe("14:00");
    expect(newSessionSchedules[0].end_time).toBe("15:00");

    // Assert: swimmer assignments for the new session use the new session ID
    const newSessionSwimmers = mockState.session_swimmers.filter(
      (ss) => ss.session_id === data.session.id,
    );
    expect(newSessionSwimmers).toHaveLength(2);
    expect(newSessionSwimmers.map((ss) => ss.swimmer_id).sort()).toEqual([1, 2]);
  });

  it("GET /api/sessions returns both sessions as separate objects", async () => {
    // Arrange: two sessions in the database
    mockState.sessions = [
      {
        id: 1,
        name: "RogueWave Masters Learn to Swim",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Pool A",
        session_date: null,
        start_time: null,
        end_time: null,
      },
      {
        id: 2,
        name: "Gold March Academy",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Pool B",
        session_date: null,
        start_time: null,
        end_time: null,
      },
    ];
    mockState.session_schedules = [
      {
        id: 1,
        session_id: 1,
        day_of_week: 1,
        start_time: "10:00",
        end_time: "11:00",
      },
      {
        id: 2,
        session_id: 2,
        day_of_week: 3,
        start_time: "14:00",
        end_time: "15:00",
      },
    ];
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
      { id: 2, name: "Bob", level: "Intermediate" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 2, swimmer_id: 2 },
    ];

    // Act: GET all sessions
    const response = await GET();
    const data = await response.json();

    // Assert: returns both sessions as separate objects
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);

    const session1 = data.find((s: any) => s.id === 1);
    const session2 = data.find((s: any) => s.id === 2);

    expect(session1).toBeDefined();
    expect(session1.name).toBe("RogueWave Masters Learn to Swim");
    expect(session1.session_schedules).toHaveLength(1);
    expect(session1.session_schedules[0].day_of_week).toBe(1);
    expect(session1.session_swimmers).toHaveLength(1);
    expect(session1.session_swimmers[0].swimmers.name).toBe("Alice");

    expect(session2).toBeDefined();
    expect(session2.name).toBe("Gold March Academy");
    expect(session2.session_schedules).toHaveLength(1);
    expect(session2.session_schedules[0].day_of_week).toBe(3);
    expect(session2.session_swimmers).toHaveLength(1);
    expect(session2.session_swimmers[0].swimmers.name).toBe("Bob");
  });

  it("does not modify existing session when creating a new one", async () => {
    // Arrange: existing session with schedules and swimmers
    mockState.sessions = [
      {
        id: 1,
        name: "RogueWave Masters Learn to Swim",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Pool A",
        session_date: null,
        start_time: null,
        end_time: null,
      },
    ];
    mockState.session_schedules = [
      {
        id: 1,
        session_id: 1,
        day_of_week: 1,
        start_time: "10:00",
        end_time: "11:00",
      },
    ];
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner" },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
    ];

    const originalSession = { ...mockState.sessions[0] };
    const originalSchedule = { ...mockState.session_schedules[0] };
    const originalAssignment = { ...mockState.session_swimmers[0] };

    // Act: POST a new session with different details
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Coach Gayani Adult Class",
        role: "Assistant Coach",
        session_type: "once",
        default_location: "Pool C",
        session_date: "2026-03-15",
        start_time: "09:00",
        end_time: "10:00",
        swimmer_ids: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Assert: POST succeeds
    expect(response.status).toBe(201);
    expect(data.session.name).toBe("Coach Gayani Adult Class");

    // Assert: original session is completely unchanged
    const originalSessionAfter = mockState.sessions.find((s) => s.id === 1);
    expect(originalSessionAfter).toEqual(originalSession!);

    // Assert: original schedule is unchanged
    const originalScheduleAfter = mockState.session_schedules.find(
      (s) => s.id === 1,
    );
    expect(originalScheduleAfter).toEqual(originalSchedule!);

    // Assert: original swimmer assignment is unchanged
    const originalAssignmentAfter = mockState.session_swimmers.find(
      (ss) => ss.session_id === 1,
    );
    expect(originalAssignmentAfter).toEqual(originalAssignment!);

    // Assert: new session has its own schedules (for one-off, no session_schedules)
    const newSessionSchedules = mockState.session_schedules.filter(
      (s) => s.session_id === data.session.id,
    );
    expect(newSessionSchedules).toHaveLength(0);

    // Assert: new session has no swimmer assignments
    const newSessionSwimmers = mockState.session_swimmers.filter(
      (ss) => ss.session_id === data.session.id,
    );
    expect(newSessionSwimmers).toHaveLength(0);
  });
});
