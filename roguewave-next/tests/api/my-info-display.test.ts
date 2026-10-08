import { describe, it, expect } from "vitest";

type CoachingHistoryRecord = {
  attendance_id: number;
  date: string;
  session_name: string;
  role: string;
  location: string | null;
  session_status: string;
  coach_status?: string | null;
  is_archived?: boolean;
};

function getStatusLabel(record: CoachingHistoryRecord): string {
  if (record.session_status === "cancelled") return "Cancelled";
  if (record.session_status === "no_session") return "No Session";
  if (record.session_status === "holiday") return "Holiday";
  if (record.role === "Head Coach") return "Completed";
  if (record.coach_status === "present") return "Completed";
  if (record.coach_status === "absent") return "Absent";
  return "Not Recorded";
}

describe("My Info Coaching History Display Labels", () => {
  it("Head Coach normal → Completed", () => {
    expect(getStatusLabel({ attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Head Coach", location: null, session_status: "normal", coach_status: "present" })).toBe("Completed");
  });

  it("Head Coach normal with null coach_status → Completed", () => {
    expect(getStatusLabel({ attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Head Coach", location: null, session_status: "normal", coach_status: null })).toBe("Completed");
  });

  it("Assistant Coach normal + present → Completed", () => {
    expect(getStatusLabel({ attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Assistant Coach", location: null, session_status: "normal", coach_status: "present" })).toBe("Completed");
  });

  it("Assistant Coach normal + absent → Absent", () => {
    expect(getStatusLabel({ attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Assistant Coach", location: null, session_status: "normal", coach_status: "absent" })).toBe("Absent");
  });

  it("Assistant Coach normal + null coach_status → Not Recorded", () => {
    expect(getStatusLabel({ attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Assistant Coach", location: null, session_status: "normal", coach_status: null })).toBe("Not Recorded");
  });

  it("cancelled → Cancelled", () => {
    expect(getStatusLabel({ attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Head Coach", location: null, session_status: "cancelled" })).toBe("Cancelled");
  });

  it("no_session → No Session", () => {
    expect(getStatusLabel({ attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Head Coach", location: null, session_status: "no_session" })).toBe("No Session");
  });

  it("holiday → Holiday", () => {
    expect(getStatusLabel({ attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Head Coach", location: null, session_status: "holiday" })).toBe("Holiday");
  });

  it("does not show raw technical labels", () => {
    const record: CoachingHistoryRecord = { attendance_id: 1, date: "2026-01-01", session_name: "S", role: "Head Coach", location: null, session_status: "normal", coach_status: "present" };
    const label = getStatusLabel(record);
    expect(label).not.toContain("Normal");
    expect(label).not.toContain("Coach");
  });
});
