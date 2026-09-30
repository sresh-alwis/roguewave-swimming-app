import { beforeEach, describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/attendance/route";
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

describe("GET /api/attendance", () => {
  it("returns 200 with normalized record when attendance exists", async () => {
    mockState.attendance_records = [
      {
        id: 1,
        session_id: 10,
        attendance_date: "2020-01-01",
        location: "Pool A",
        session_status: "normal",
        coach_status: null,
        created_at: "2020-01-01T10:00:00Z",
        updated_at: "2020-01-01T10:00:00Z",
      },
    ];
    mockState.attendance_swimmers = [
      {
        id: 100,
        attendance_id: 1,
        swimmer_id: 5,
        swimmer_name: "Alice",
        attendance_status: "present",
        created_at: "2020-01-01T10:00:00Z",
      },
    ];

    const request = new Request(
      "http://localhost/api/attendance?session_id=10&date=2020-01-01",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record).toBeDefined();
    expect(data.record.id).toBe(1);
    expect(data.record.session_id).toBe(10);
    expect(data.record.location).toBe("Pool A");
    expect(data.record.session_status).toBe("normal");
    expect(data.record.swimmers).toHaveLength(1);
    expect(data.record.swimmers[0].swimmer_name).toBe("Alice");
  });

  it("returns { record: null } when no attendance exists", async () => {
    const request = new Request(
      "http://localhost/api/attendance?session_id=10&date=2020-01-01",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.record).toBeNull();
  });

  it("returns 400 for invalid session_id", async () => {
    const request = new Request(
      "http://localhost/api/attendance?session_id=abc&date=2020-01-01",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 for invalid date format", async () => {
    const request = new Request(
      "http://localhost/api/attendance?session_id=10&date=not-a-date",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
