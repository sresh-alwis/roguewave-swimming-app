import { describe, it, expect } from "vitest";

// These tests verify the mapping logic that should be applied in both
// the frontend (src/app/attendance/[id]/page.tsx) and the POST API
// (src/app/api/attendance/route.ts) for Assistant Coach attendance.

type CoachStatusSelection =
  | "present"
  | "absent"
  | "cancelled"
  | "no-session"
  | "holiday";

function mapAssistantCoachSelection(
  coachStatus: CoachStatusSelection,
): { session_status: string; coach_status: string | null } {
  if (coachStatus === "present" || coachStatus === "absent") {
    return { session_status: "normal", coach_status: coachStatus };
  }
  if (coachStatus === "no-session") {
    return { session_status: "no_session", coach_status: null };
  }
  return { session_status: coachStatus, coach_status: null };
}

describe("Assistant Coach attendance status mapping", () => {
  it("Present -> session_status=normal, coach_status=present", () => {
    expect(mapAssistantCoachSelection("present")).toEqual({
      session_status: "normal",
      coach_status: "present",
    });
  });

  it("Absent -> session_status=normal, coach_status=absent", () => {
    expect(mapAssistantCoachSelection("absent")).toEqual({
      session_status: "normal",
      coach_status: "absent",
    });
  });

  it("Cancelled -> session_status=cancelled, coach_status=null", () => {
    expect(mapAssistantCoachSelection("cancelled")).toEqual({
      session_status: "cancelled",
      coach_status: null,
    });
  });

  it("No Session -> session_status=no_session, coach_status=null", () => {
    expect(mapAssistantCoachSelection("no-session")).toEqual({
      session_status: "no_session",
      coach_status: null,
    });
  });

  it("Holiday -> session_status=holiday, coach_status=null", () => {
    expect(mapAssistantCoachSelection("holiday")).toEqual({
      session_status: "holiday",
      coach_status: null,
    });
  });

  it("does not store invalid normal+cancelled combination", () => {
    const result = mapAssistantCoachSelection("cancelled");
    expect(result.session_status).not.toBe("normal");
    expect(result.coach_status).not.toBe("cancelled");
  });
});
