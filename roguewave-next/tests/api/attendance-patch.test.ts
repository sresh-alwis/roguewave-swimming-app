/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { PATCH } from "@/app/api/attendance/[id]/route";
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

function makeExistingAttendance(
  id: number,
  sessionId: number,
  status: string,
): Record<string, any> {
  return {
    id,
    session_id: sessionId,
    attendance_date: "2020-01-01",
    location: "Pool A",
    session_status: status,
    coach_status: null,
    created_at: "2020-01-01T10:00:00Z",
    updated_at: "2020-01-01T10:00:00Z",
  };
}

function makeSwimmerRow(
  id: number,
  attendanceId: number,
  swimmerId: number | null,
  name: string,
  status: string,
): Record<string, any> {
  return {
    id,
    attendance_id: attendanceId,
    swimmer_id: swimmerId,
    swimmer_name: name,
    attendance_status: status,
    created_at: "2020-01-01T10:00:00Z",
  };
}

async function callPatch(id: string, body: any) {
  const request = new Request(`http://localhost/api/attendance/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/attendance/[id]", () => {
  it("location-only PATCH preserves existing swimmer rows", async () => {
    mockState.sessions = [makeHeadCoachSession()];
    mockState.attendance_records = [makeExistingAttendance(1, 10, "normal")];
    mockState.attendance_swimmers = [
      makeSwimmerRow(100, 1, 1, "Alice", "present"),
      makeSwimmerRow(101, 1, 2, "Bob", "absent"),
    ];

    const response = await callPatch("1", { location: "New Pool" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record.location).toBe("New Pool");

    const swimmerRows = mockState.attendance_swimmers.filter(
      (s) => s.attendance_id === 1,
    );
    expect(swimmerRows).toHaveLength(2);
  });

  it("normal -> cancelled removes swimmer rows", async () => {
    mockState.sessions = [makeHeadCoachSession()];
    mockState.attendance_records = [makeExistingAttendance(1, 10, "normal")];
    mockState.attendance_swimmers = [
      makeSwimmerRow(100, 1, 1, "Alice", "present"),
      makeSwimmerRow(101, 1, 2, "Bob", "absent"),
    ];

    const response = await callPatch("1", { session_status: "cancelled" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record.session_status).toBe("cancelled");

    const swimmerRows = mockState.attendance_swimmers.filter(
      (s) => s.attendance_id === 1,
    );
    expect(swimmerRows).toHaveLength(0);
  });

  it("cancelled -> normal without present_swimmer_ids returns 400", async () => {
    mockState.sessions = [makeHeadCoachSession()];
    mockState.attendance_records = [makeExistingAttendance(1, 10, "cancelled")];

    const response = await callPatch("1", { session_status: "normal" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.error).toContain("present_swimmer_ids");
  });

  it("cancelled -> normal with present_swimmer_ids recreates swimmer rows", async () => {
    mockState.sessions = [makeHeadCoachSession()];
    mockState.attendance_records = [makeExistingAttendance(1, 10, "cancelled")];

    const response = await callPatch("1", {
      session_status: "normal",
      present_swimmer_ids: [1],
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record.session_status).toBe("normal");

    const swimmerRows = mockState.attendance_swimmers.filter(
      (s) => s.attendance_id === 1,
    );
    expect(swimmerRows).toHaveLength(2);

    const alice = swimmerRows.find((s) => s.swimmer_id === 1)!;
    const bob = swimmerRows.find((s) => s.swimmer_id === 2)!;
    expect(alice.attendance_status).toBe("present");
    expect(bob.attendance_status).toBe("absent");
  });

  it("Assistant Coach PATCH updates coach_status correctly", async () => {
    mockState.sessions = [makeAssistantCoachSession()];
    mockState.attendance_records = [makeExistingAttendance(1, 20, "normal")];

    const response = await callPatch("1", { coach_status: "absent" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record.coach_status).toBe("absent");
    expect(data.record.session_status).toBe("normal");
  });

  it("historical swimmer with null swimmer_id remains safe during rebuild", async () => {
    mockState.sessions = [makeHeadCoachSession()];
    mockState.attendance_records = [makeExistingAttendance(1, 10, "normal")];
    mockState.attendance_swimmers = [
      makeSwimmerRow(100, 1, 1, "Alice", "present"),
      makeSwimmerRow(101, 1, null, "Deleted Swimmer", "present"),
    ];

    const response = await callPatch("1", {
      session_status: "normal",
      present_swimmer_ids: [1],
    });

    expect(response.status).toBe(200);

    const swimmerRows = mockState.attendance_swimmers.filter(
      (s) => s.attendance_id === 1,
    );

    const deleted = swimmerRows.find((s) => s.swimmer_id === null)!;
    expect(deleted).toBeDefined();
    expect(deleted.attendance_status).toBe("present");
  });
});
