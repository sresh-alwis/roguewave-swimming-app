/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/attendance/route";
import {
  createMockSupabaseState,
  createQueryBuilder,
  type MockSupabaseState,
} from "../mocks/supabase-attendance";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: fromMock,
  },
}));

let mockState: MockSupabaseState;

beforeEach(() => {
  mockState = createMockSupabaseState();
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) =>
    createQueryBuilder(table, mockState),
  );
});

function makeHeadCoachSession(): Record<string, any> {
  return {
    id: 10,
    name: "Test Session",
    role: "Head Coach",
    session_type: "recurring",
    default_location: "Pool A",
    session_date: null,
    start_time: null,
    end_time: null,
    session_schedules: [
      { id: 1, day_of_week: 3, start_time: "10:00", end_time: "11:00" },
    ],
    session_swimmers: [
      { swimmer_id: 1, session_id: 10, swimmers: { id: 1, name: "Alice", level: "A" } },
      { swimmer_id: 2, session_id: 10, swimmers: { id: 2, name: "Bob", level: "B" } },
    ],
  };
}

function makeAssistantCoachSession(): Record<string, any> {
  return {
    id: 20,
    name: "Assistant Session",
    role: "Assistant Coach",
    session_type: "recurring",
    default_location: "Pool B",
    session_date: null,
    start_time: null,
    end_time: null,
    session_schedules: [
      { id: 2, day_of_week: 3, start_time: "12:00", end_time: "13:00" },
    ],
    session_swimmers: [],
  };
}

describe("POST /api/attendance", () => {
  it("creates Head Coach normal attendance successfully", async () => {
    mockState.sessions = [makeHeadCoachSession()];

    const request = new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: 10,
        attendance_date: "2020-01-01",
        location: "Pool A",
        session_status: "normal",
        coach_status: null,
        present_swimmer_ids: [1],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.record).toBeDefined();
    expect(data.record.session_id).toBe(10);
    expect(data.record.session_status).toBe("normal");
    // Head Coach normal sessions now have coach_status (defaults to "present")
    expect(data.record.coach_status).toBe("present");
  });

  it("creates correct present/absent swimmer rows", async () => {
    mockState.sessions = [makeHeadCoachSession()];

    const request = new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: 10,
        attendance_date: "2020-01-01",
        location: "Pool A",
        session_status: "normal",
        coach_status: null,
        present_swimmer_ids: [1],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);

    const swimmerRows = mockState.attendance_swimmers.filter(
      (s) => s.attendance_id === data.record.id,
    );

    expect(swimmerRows).toHaveLength(2);

    const alice = swimmerRows.find((s) => s.swimmer_id === 1)!;
    const bob = swimmerRows.find((s) => s.swimmer_id === 2)!;

    expect(alice.attendance_status).toBe("present");
    expect(bob.attendance_status).toBe("absent");
  });

  it("returns 409 for duplicate attendance", async () => {
    mockState.sessions = [makeHeadCoachSession()];
    mockState.attendance_records = [
      {
        id: 99,
        session_id: 10,
        attendance_date: "2020-01-01",
        location: "Pool A",
        session_status: "normal",
        coach_status: null,
        created_at: "2020-01-01T10:00:00Z",
        updated_at: "2020-01-01T10:00:00Z",
      },
    ];

    const request = new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: 10,
        attendance_date: "2020-01-01",
        location: "Pool A",
        session_status: "normal",
        coach_status: null,
        present_swimmer_ids: [1],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBeDefined();
  });

  it("returns 400 for future date", async () => {
    mockState.sessions = [makeHeadCoachSession()];

    const request = new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: 10,
        attendance_date: "2099-01-01",
        location: "Pool A",
        session_status: "normal",
        coach_status: null,
        present_swimmer_ids: [1],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 for missing required fields", async () => {
    const request = new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: 10,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 for invalid session_status", async () => {
    const request = new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: 10,
        attendance_date: "2020-01-01",
        location: "Pool A",
        session_status: "invalid_status",
        coach_status: null,
        present_swimmer_ids: [1],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 when Head Coach normal attendance is missing present_swimmer_ids", async () => {
    mockState.sessions = [makeHeadCoachSession()];

    const request = new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: 10,
        attendance_date: "2020-01-01",
        location: "Pool A",
        session_status: "normal",
        coach_status: null,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("creates Assistant Coach attendance correctly", async () => {
    mockState.sessions = [makeAssistantCoachSession()];

    const request = new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: 20,
        attendance_date: "2020-01-01",
        location: "Pool B",
        session_status: "normal",
        coach_status: "present",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.record).toBeDefined();
    expect(data.record.coach_status).toBe("present");
    expect(data.record.session_status).toBe("normal");
  });
});
