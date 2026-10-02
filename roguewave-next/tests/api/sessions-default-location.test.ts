import { beforeEach, describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/sessions/route";
import { PATCH } from "@/app/api/sessions/[id]/route";
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

describe("POST /api/sessions - default_location", () => {
  it("stores default_location when provided", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "RogueWave Masters",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "President's College Pool",
        schedules: [{ day_of_week: 1, start_time: "10:00", end_time: "11:00" }],
        swimmer_ids: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.session.default_location).toBe("President's College Pool");
  });

  it("accepts null default_location", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "RogueWave Masters",
        role: "Head Coach",
        session_type: "recurring",
        default_location: null,
        schedules: [{ day_of_week: 1, start_time: "10:00", end_time: "11:00" }],
        swimmer_ids: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.session.default_location).toBeNull();
  });

  it("stores null when default_location is empty string", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "RogueWave Masters",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "",
        schedules: [{ day_of_week: 1, start_time: "10:00", end_time: "11:00" }],
        swimmer_ids: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.session.default_location).toBeNull();
  });
});

describe("PATCH /api/sessions/[id] - default_location", () => {
  it("changes default_location", async () => {
    mockState.sessions = [
      {
        id: 1,
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Old Pool",
        session_date: null,
        start_time: null,
        end_time: null,
      },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "President's College Pool",
        schedules: [{ day_of_week: 1, start_time: "10:00", end_time: "11:00" }],
        swimmer_ids: [],
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.default_location).toBe("President's College Pool");
  });

  it("can clear default_location to null", async () => {
    mockState.sessions = [
      {
        id: 1,
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "President's College Pool",
        session_date: null,
        start_time: null,
        end_time: null,
      },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "",
        schedules: [{ day_of_week: 1, start_time: "10:00", end_time: "11:00" }],
        swimmer_ids: [],
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.default_location).toBeNull();
  });

  it("changing Session B's location does not affect Session A", async () => {
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
      {
        id: 2,
        name: "Session B",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Pool B",
        session_date: null,
        start_time: null,
        end_time: null,
      },
    ];

    const request = new Request("http://localhost/api/sessions/2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session B",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "Sugathadasa Pool",
        schedules: [{ day_of_week: 3, start_time: "14:00", end_time: "15:00" }],
        swimmer_ids: [],
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "2" }),
    });

    expect(response.status).toBe(200);

    const sessionA = mockState.sessions.find((s) => s.id === 1);
    expect(sessionA!.default_location).toBe("Pool A");
  });

  it("location-only edit does not remove swimmer assignments", async () => {
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
      body: JSON.stringify({
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "New Pool",
        schedules: [{ day_of_week: 1, start_time: "10:00", end_time: "11:00" }],
        swimmer_ids: [1, 2],
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);

    const assignments = mockState.session_swimmers.filter(
      (ss) => ss.session_id === 1,
    );
    expect(assignments).toHaveLength(2);
  });

  it("location-only edit does not remove recurring schedules", async () => {
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
    mockState.session_schedules = [
      { id: 1, session_id: 1, day_of_week: 1, start_time: "10:00", end_time: "11:00" },
      { id: 2, session_id: 1, day_of_week: 3, start_time: "14:00", end_time: "15:00" },
    ];

    const request = new Request("http://localhost/api/sessions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session A",
        role: "Head Coach",
        session_type: "recurring",
        default_location: "New Pool",
        schedules: [
          { day_of_week: 1, start_time: "10:00", end_time: "11:00" },
          { day_of_week: 3, start_time: "14:00", end_time: "15:00" },
        ],
        swimmer_ids: [],
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);

    const schedules = mockState.session_schedules.filter(
      (s) => s.session_id === 1,
    );
    expect(schedules).toHaveLength(2);
  });
});
