import { beforeEach, describe, it, expect, vi } from "vitest";
import { GET as GET_SESSIONS } from "@/app/api/sessions/route";
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

describe("Sessions/Attendance Roster Consistency", () => {
  it("active assigned swimmer appears in Sessions API response", async () => {
    mockState.swimmers = [
      { id: 1, name: "Isali Rozairo", level: "Beginner", is_archived: false },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
    ];

    const request = new Request("http://localhost/api/sessions");
    const response = await GET_SESSIONS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].session_swimmers).toHaveLength(1);
    expect(data[0].session_swimmers[0].swimmers.name).toBe("Isali Rozairo");
  });

  it("archived swimmer is excluded from Sessions API response", async () => {
    mockState.swimmers = [
      { id: 1, name: "Active Swimmer", level: "Beginner", is_archived: false },
      { id: 2, name: "Archived Swimmer", level: "Intermediate", is_archived: true },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.session_swimmers = [
      { session_id: 1, swimmer_id: 1 },
      { session_id: 1, swimmer_id: 2 },
    ];

    const request = new Request("http://localhost/api/sessions");
    const response = await GET_SESSIONS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    // Only active swimmer should appear
    expect(data[0].session_swimmers).toHaveLength(1);
    expect(data[0].session_swimmers[0].swimmers.name).toBe("Active Swimmer");
  });

  it("My Info API loads successfully with current schema", async () => {
    mockState.swimmers = [
      { id: 1, name: "Alice", level: "Beginner", is_archived: false },
    ];
    mockState.sessions = [
      { id: 1, name: "Session A", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: "present", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.current_swimmers).toBe(1);
    expect(data.my_coaching_sessions).toBe(1);
    expect(data.history).toHaveLength(1);
  });

  it("My Info coaching sessions count follows business rules", async () => {
    mockState.swimmers = [];
    mockState.sessions = [
      { id: 1, name: "HC Session", role: "Head Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
      { id: 2, name: "AC Session", role: "Assistant Coach", session_type: "recurring", default_location: null, session_date: null, start_time: null, end_time: null, is_archived: false },
    ];
    mockState.attendance_records = [
      { id: 100, session_id: 1, attendance_date: "2026-09-01", location: null, session_status: "normal", coach_status: "present", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z" },
      { id: 101, session_id: 2, attendance_date: "2026-09-02", location: null, session_status: "normal", coach_status: "present", created_at: "2026-09-02T10:00:00Z", updated_at: "2026-09-02T10:00:00Z" },
      { id: 102, session_id: 2, attendance_date: "2026-09-03", location: null, session_status: "normal", coach_status: "absent", created_at: "2026-09-03T10:00:00Z", updated_at: "2026-09-03T10:00:00Z" },
    ];

    const response = await GET_MY_INFO();
    const data = await response.json();

    expect(response.status).toBe(200);
    // Head Coach normal (1) + Assistant Coach normal+present (1) = 2
    expect(data.my_coaching_sessions).toBe(2);
  });
});

describe("Swimmer Delete UI State", () => {
  it("no-history swimmer exposes safe Delete state", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const pagePath = path.join(process.cwd(), "src/app/swimmers/[id]/page.tsx");
    const pageSource = fs.readFileSync(pagePath, "utf-8");

    // The delete button should be conditional on hasAttendanceHistory
    expect(pageSource).toContain("hasAttendanceHistory");
    expect(pageSource).toContain("Delete");
  });

  it("swimmer with history does not expose normal Delete", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const pagePath = path.join(process.cwd(), "src/app/swimmers/[id]/page.tsx");
    const pageSource = fs.readFileSync(pagePath, "utf-8");

    // The delete button should be hidden when hasAttendanceHistory is true
    expect(pageSource).toContain("!swimmer.hasAttendanceHistory");
  });
});

describe("Navigation Order", () => {
  it("shared AppShell navigation has correct order", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const navPath = path.join(process.cwd(), "src/lib/navigation.ts");
    const navSource = fs.readFileSync(navPath, "utf-8");

    // Extract href values in order from navigationItems array
    const hrefMatches = [...navSource.matchAll(/href:\s*"([^"]+)"/g)].map(
      (m) => m[1],
    );

    // All links should exist
    expect(hrefMatches).toContain("/home");
    expect(hrefMatches).toContain("/swimmers");
    expect(hrefMatches).toContain("/sessions");
    expect(hrefMatches).toContain("/attendance");
    expect(hrefMatches).toContain("/my-info");
    expect(hrefMatches).toContain("/settings");

    // Order: Home < Swimmers < Sessions < Attendance < My Info < Settings
    const homeIdx = hrefMatches.indexOf("/home");
    const swimmersIdx = hrefMatches.indexOf("/swimmers");
    const sessionsIdx = hrefMatches.indexOf("/sessions");
    const attendanceIdx = hrefMatches.indexOf("/attendance");
    const myInfoIdx = hrefMatches.indexOf("/my-info");
    const settingsIdx = hrefMatches.indexOf("/settings");

    expect(homeIdx).toBeLessThan(swimmersIdx);
    expect(swimmersIdx).toBeLessThan(sessionsIdx);
    expect(sessionsIdx).toBeLessThan(attendanceIdx);
    expect(attendanceIdx).toBeLessThan(myInfoIdx);
    expect(myInfoIdx).toBeLessThan(settingsIdx);
  });
});
