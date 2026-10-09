"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";

type Schedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Swimmer = {
  id: number;
  name: string;
};

type Session = {
  id: number;
  name: string;
  role: "Head Coach" | "Assistant Coach";
  defaultLocation: string;
  schedules: Schedule[];
  swimmers: Swimmer[];
  date?: string;
  startTime?: string;
  endTime?: string;
};

type ApiSession = {
  id: number;
  name: string;
  role: "Head Coach" | "Assistant Coach";
  default_location: string | null;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_schedules: {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
  swimmers: Swimmer[];
  session_swimmers: {
    swimmers: Swimmer | null;
  }[];
};

type SessionStatus = "normal" | "cancelled" | "no-session" | "holiday";

type CoachStatus =
  | "present"
  | "absent"
  | "cancelled"
  | "no-session"
  | "holiday";

type ApiAttendanceRecord = {
  id: number;
  session_id: number;
  attendance_date: string;
  location: string | null;
  session_status: string;
  coach_status: string | null;
  swimmers: {
    id: number;
    swimmer_id: number | null;
    swimmer_name: string;
    attendance_status: string;
  }[];
};

function useMounted(): boolean {
  return useSyncExternalStore(
    () => {
      return () => {};
    },
    () => true,
    () => false,
  );
}

export default function AttendanceSessionPage() {
  const params = useParams();

  const sessionId = Number(params.id);

  const mounted = useMounted();

  if (!mounted) {
    return (
      <AppShell>
        <main style={pageStyle}>
          <section style={cardStyle}>
            <p>Loading attendance...</p>
          </section>
        </main>
      </AppShell>
    );
  }

  return <AttendanceContent key={sessionId} sessionId={sessionId} />;
}

function AttendanceContent({
  sessionId,
}: {
  sessionId: number;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState("");

  const [editing, setEditing] = useState(false);

  const [presentSwimmers, setPresentSwimmers] = useState<number[]>([]);

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("normal");

  const [coachStatus, setCoachStatus] = useState<CoachStatus>("present");

  const [location, setLocation] = useState("");

  const [attendanceRecord, setAttendanceRecord] =
    useState<ApiAttendanceRecord | null>(null);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const attendanceRequestKey = useRef<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load session.");
        }

        const apiSession = data as ApiSession;

        const loadedSession: Session = {
          id: apiSession.id,
          name: apiSession.name,
          role: apiSession.role,
          defaultLocation: apiSession.default_location || "",
          schedules: (apiSession.session_schedules || []).map((s) => ({
            dayOfWeek: s.day_of_week,
            startTime: s.start_time,
            endTime: s.end_time,
          })),
          swimmers:
            (apiSession.session_swimmers || [])
              .map((item) => item.swimmers)
              .filter((swimmer): swimmer is Swimmer => swimmer !== null),
          date: apiSession.session_date || undefined,
          startTime: apiSession.start_time || undefined,
          endTime: apiSession.end_time || undefined,
        };

        setSession(loadedSession);

        const urlParams = new URLSearchParams(window.location.search);
        const queryDate = urlParams.get("date");
        const initialDate =
          queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)
            ? queryDate
            : getTodayKey();

        setSelectedDate(initialDate);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load session.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  const loadAttendance = useCallback(
    async (
      attendanceSessionId: number,
      date: string,
      defaultLocation: string,
    ) => {
      const requestKey = `${attendanceSessionId}-${date}`;

      if (attendanceRequestKey.current === requestKey) {
        return;
      }

      attendanceRequestKey.current = requestKey;

      try {
        const response = await fetch(
          `/api/attendance?session_id=${attendanceSessionId}&date=${date}`,
          { cache: "no-store" },
        );

        const data = await response.json();

        if (!response.ok) {
          setAttendanceRecord(null);
          return;
        }

        const record = data.record as ApiAttendanceRecord | null;

        setAttendanceRecord(record);

        if (record) {
          setLocation(record.location ?? defaultLocation);
          setSessionStatus(record.session_status as SessionStatus);
          setCoachStatus((record.coach_status ?? "present") as CoachStatus);
          setPresentSwimmers(
            record.swimmers
              .filter((swimmer) => swimmer.attendance_status === "present")
              .map((swimmer) => swimmer.swimmer_id)
              .filter((id): id is number => id !== null),
          );
        } else {
          setLocation(defaultLocation);
          setSessionStatus("normal");
          setCoachStatus("present");
          setPresentSwimmers([]);
        }
      } catch {
        setAttendanceRecord(null);
      } finally {
        attendanceRequestKey.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (session && selectedDate) {
      // Data-fetching effect: setState happens after the first await inside
      // loadAttendance, not synchronously in the effect body.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAttendance(sessionId, selectedDate, session.defaultLocation);
    }
  }, [session, selectedDate, sessionId, loadAttendance]);

  if (loading) {
    return (
      <AppShell>
        <main style={pageStyle}>
          <section style={cardStyle}>
            <p>Loading attendance...</p>
          </section>
        </main>
      </AppShell>
    );
  }

  if (error || !session) {
    return (
      <AppShell>
        <main style={pageStyle}>
          <section style={cardStyle}>
            <h1>Session not found</h1>

            <p style={helperTextStyle}>{error}</p>

            <Link href="/attendance" style={buttonLinkStyle}>
              Back to Attendance
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  const currentSession = session;

  const isHeadCoach = currentSession.role === "Head Coach";

  const hasSwimmers = isHeadCoach && currentSession.swimmers.length > 0;

  const existingRecord = selectedDate ? attendanceRecord : null;

  const selectedSchedule = selectedDate
    ? getScheduleForDate(currentSession, selectedDate)
    : null;

  const validAttendanceDate = Boolean(selectedSchedule || existingRecord);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setEditing(false);

    setAttendanceRecord(null);

    setPresentSwimmers([]);

    setSessionStatus("normal");

    setCoachStatus("present");

    setLocation(currentSession.defaultLocation);
  }

  function toggleSwimmer(swimmerId: number) {
    if (existingRecord && !editing) {
      return;
    }

    setPresentSwimmers((current) =>
      current.includes(swimmerId)
        ? current.filter((id) => id !== swimmerId)
        : [...current, swimmerId],
    );
  }

  async function handleSave() {
    if (!selectedDate) {
      setFeedback({ type: "error", message: "Please select a date." });
      return;
    }

    if (selectedDate > getTodayKey()) {
      setFeedback({ type: "error", message: "Attendance cannot be marked for a future date." });
      return;
    }

    if (!selectedSchedule && !existingRecord) {
      setFeedback({ type: "error", message: "This session is not scheduled on the selected date." });
      return;
    }

    const attendanceLocation =
      location.trim() || currentSession.defaultLocation;

    setSaving(true);

    if (existingRecord) {
      // Update existing attendance via the real API.
      const body: {
        location: string;
        session_status?: string;
        coach_status?: string | null;
        present_swimmer_ids?: number[];
      } = {
        location: attendanceLocation,
      };

      if (isHeadCoach) {
        body.session_status = sessionStatus;

        const wasNormal = existingRecord.session_status === "normal";
        const originalPresentIds = existingRecord.swimmers
          .filter((swimmer) => swimmer.attendance_status === "present")
          .map((swimmer) => swimmer.swimmer_id)
          .filter((id): id is number => id !== null);

        const selectionChanged =
          presentSwimmers.length !== originalPresentIds.length ||
          !presentSwimmers.every((id) => originalPresentIds.includes(id));

        if (sessionStatus === "normal" && (!wasNormal || selectionChanged)) {
          body.present_swimmer_ids = presentSwimmers;
        }
        // Head Coach: no coach_status needed (presence implied by normal session)
      } else {
        // Assistant Coach: map UI selection to session_status + coach_status
        if (coachStatus === "present" || coachStatus === "absent") {
          body.session_status = "normal";
          body.coach_status = coachStatus;
        } else if (coachStatus === "no-session") {
          body.session_status = "no_session";
          body.coach_status = null;
        } else {
          // cancelled, holiday
          body.session_status = coachStatus;
          body.coach_status = null;
        }
      }

      try {
        const response = await fetch(
          `/api/attendance/${existingRecord.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          setFeedback({ type: "error", message: data.error || "Failed to update attendance." });
          return;
        }

        const record = data.record as ApiAttendanceRecord;

        setAttendanceRecord(record);

        setLocation(record.location ?? currentSession.defaultLocation);
        setSessionStatus(record.session_status as SessionStatus);
        setCoachStatus((record.coach_status ?? "present") as CoachStatus);
        setPresentSwimmers(
          record.swimmers
            .filter((swimmer) => swimmer.attendance_status === "present")
            .map((swimmer) => swimmer.swimmer_id)
            .filter((id): id is number => id !== null),
        );

        setFeedback({ type: "success", message: "Attendance updated." });

        setEditing(false);
      } catch {
        setFeedback({ type: "error", message: "Failed to update attendance." });
      } finally {
        setSaving(false);
      }

      return;
    }

    // Create new attendance via the real API.
    const body: {
      session_id: number;
      attendance_date: string;
      location: string;
      session_status: string;
      coach_status?: string | null;
      present_swimmer_ids?: number[];
    } = {
      session_id: sessionId,
      attendance_date: selectedDate,
      location: attendanceLocation,
      session_status: sessionStatus,
    };

    if (isHeadCoach) {
      // Head Coach: no coach_status needed (presence implied by normal session)
      body.present_swimmer_ids =
        sessionStatus === "normal" ? presentSwimmers : [];
    } else {
      // Assistant Coach: map UI selection to session_status + coach_status
      if (coachStatus === "present" || coachStatus === "absent") {
        body.session_status = "normal";
        body.coach_status = coachStatus;
      } else {
        // cancelled, no-session, holiday
        body.session_status = coachStatus;
        body.coach_status = null;
      }
    }

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: "error", message: data.error || "Failed to save attendance." });
        return;
      }

      const record = data.record as ApiAttendanceRecord;

      setAttendanceRecord(record);

      setLocation(record.location ?? currentSession.defaultLocation);
      setSessionStatus(record.session_status as SessionStatus);
      setCoachStatus((record.coach_status ?? "present") as CoachStatus);
      setPresentSwimmers(
        record.swimmers
          .filter((swimmer) => swimmer.attendance_status === "present")
          .map((swimmer) => swimmer.swimmer_id)
          .filter((id): id is number => id !== null),
      );

      setFeedback({ type: "success", message: "Attendance saved." });

      setEditing(false);
    } catch {
      setFeedback({ type: "error", message: "Failed to save attendance." });
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (!attendanceRecord) {
      return;
    }

    setPresentSwimmers(
      attendanceRecord.swimmers
        .filter((swimmer) => swimmer.attendance_status === "present")
        .map((swimmer) => swimmer.swimmer_id)
        .filter((id): id is number => id !== null),
    );

    setSessionStatus(attendanceRecord.session_status as SessionStatus);

    setCoachStatus((attendanceRecord.coach_status ?? "present") as CoachStatus);

    setLocation(attendanceRecord.location ?? currentSession.defaultLocation);

    setEditing(false);
  }

  return (
    <AppShell>
      <section style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h1
              style={{
                margin: 0,
              }}
            >
              {currentSession.name}
            </h1>

            <p style={roleStyle}>{currentSession.role}</p>
          </div>

          <span style={typeBadgeStyle}>
            {hasSwimmers
              ? `${currentSession.swimmers.length} swimmers`
              : "My attendance"}
          </span>
        </div>

        {/* Date */}
        <div style={sectionStyle}>
          <label>
            Attendance Date
            <input
              type="date"
              value={selectedDate}
              max={getTodayKey()}
              onChange={(e) => handleDateChange(e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>

        {!selectedDate && (
          <p style={helperTextStyle}>
            Select a date to mark or review attendance.
          </p>
        )}

        {selectedDate && (
          <>
            {/* Date Information */}
            <div style={dateInfoStyle}>
              <div>
                <span style={smallLabelStyle}>Date</span>

                <strong>{formatDisplayDate(selectedDate)}</strong>
              </div>

              {selectedSchedule && (
                <div>
                  <span style={smallLabelStyle}>Session Time</span>

                  <strong>
                    {formatTime(selectedSchedule.startTime || "")} -{" "}
                    {formatTime(selectedSchedule.endTime || "")}
                  </strong>
                </div>
              )}
            </div>

            {/* Invalid Date */}
            {!validAttendanceDate && (
              <div style={warningBoxStyle}>
                No session is scheduled on this date.
              </div>
            )}

            {/* Valid Attendance */}
            {validAttendanceDate && (
              <>
                {/* Location */}
                <div style={sectionStyle}>
                  <label>
                    Location
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={Boolean(existingRecord) && !editing}
                      style={inputStyle}
                    />
                  </label>
                </div>

                {/* Already Marked */}
                {existingRecord && !editing && (
                  <div style={markedBoxStyle}>✓ Attendance Already Marked</div>
                )}

                {/* Swimmer Attendance — Head Coach */}
                {isHeadCoach && !hasSwimmers && (
                  <div style={sectionStyle}>
                    <p style={helperTextStyle}>
                      No swimmers assigned to this session.
                    </p>
                  </div>
                )}

                {/* Swimmer Attendance — Head Coach with swimmers */}
                {hasSwimmers && (
                  <div style={sectionStyle}>
                    <h2
                      style={{
                        marginTop: 0,
                      }}
                    >
                      Swimmer Attendance
                    </h2>

                    {sessionStatus === "normal" && (
                      <>
                        <div style={attendanceSummaryStyle}>
                          <span>Present</span>

                          <strong>
                            {presentSwimmers.length}/
                            {currentSession.swimmers.length}
                          </strong>
                        </div>

                        <p style={helperTextStyle}>
                          Checked = Present. Unchecked = Absent.
                        </p>

                        <div style={swimmerListStyle}>
                          {currentSession.swimmers.map((swimmer) => (
                            <label key={swimmer.id} style={checkboxRowStyle}>
                              <input
                                type="checkbox"
                                checked={presentSwimmers.includes(swimmer.id)}
                                disabled={Boolean(existingRecord) && !editing}
                                onChange={() => toggleSwimmer(swimmer.id)}
                              />

                              {swimmer.name}
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    <div
                      style={{
                        marginTop: "25px",
                      }}
                    >
                      <h3>Session Status</h3>

                      {[
                        ["normal", "Normal Session"],
                        ["cancelled", "Cancelled"],
                        ["no-session", "No Session"],
                        ["holiday", "Holiday"],
                      ].map(([value, label]) => (
                        <label key={value} style={radioRowStyle}>
                          <input
                            type="radio"
                            name="sessionStatus"
                            value={value}
                            checked={sessionStatus === value}
                            disabled={Boolean(existingRecord) && !editing}
                            onChange={(e) =>
                              setSessionStatus(e.target.value as SessionStatus)
                            }
                          />

                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant Coach Attendance */}
                {!isHeadCoach && (
                  <div style={sectionStyle}>
                    <h2
                      style={{
                        marginTop: 0,
                      }}
                    >
                      My Coaching Status
                    </h2>

                    <p style={helperTextStyle}>
                      Record whether you coached this session.
                    </p>

                    {[
                      ["present", "Present"],
                      ["absent", "Absent"],
                      ["cancelled", "Cancelled"],
                      ["no-session", "No Session"],
                      ["holiday", "Holiday"],
                    ].map(([value, label]) => (
                      <label key={value} style={radioRowStyle}>
                        <input
                          type="radio"
                          name="coachStatus"
                          value={value}
                          checked={coachStatus === value}
                          disabled={Boolean(existingRecord) && !editing}
                          onChange={(e) =>
                            setCoachStatus(e.target.value as CoachStatus)
                          }
                        />

                        {label}
                      </label>
                    ))}
                  </div>
                )}

                {/* Save / Edit Actions */}
                <div style={buttonRowStyle}>
                  {existingRecord && !editing ? (
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={() => setEditing(true)}
                    >
                      Edit Attendance
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : existingRecord
                          ? "Update Attendance"
                          : "Save Attendance"}
                    </button>
                  )}

                  {existingRecord && editing && (
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={cancelEdit}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            style={
              feedback.type === "success"
                ? feedbackSuccessStyle
                : feedbackErrorStyle
            }
          >
            {feedback.message}
          </div>
        )}

        {/* Close is ALWAYS visible */}
        <div style={closeRowStyle}>
          <Link href="/attendance" style={closeLinkStyle}>
            Close
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

function getScheduleForDate(session: Session, date: string) {
  const selected = new Date(`${date}T00:00:00`);

  if (Number.isNaN(selected.getTime())) {
    return null;
  }

  // One-off sessions: match against session_date
  if (session.schedules.length === 0 && session.date) {
    return session.date === date ? { startTime: session.startTime, endTime: session.endTime } : null;
  }

  // Recurring sessions: match against day_of_week
  const dayOfWeek = selected.getDay();

  return (
    session.schedules.find((schedule) => schedule.dayOfWeek === dayOfWeek) ||
    null
  );
}

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string) {
  const [hourText, minute] = time.split(":");

  const hour = Number(hourText);

  const period = hour >= 12 ? "PM" : "AM";

  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
  color: "var(--text)",
  padding: "clamp(20px, 4vw, 40px)",
  fontFamily: "Arial, sans-serif",
};

const cardStyle = {
  maxWidth: "800px",
  margin: "0 auto",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "clamp(20px, 4vw, 30px)",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
  gap: "20px",
};

const roleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
};

const typeBadgeStyle = {
  backgroundColor: "var(--accent-background)",
  color: "var(--accent-text)",
  padding: "6px 10px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
};

const sectionStyle = {
  marginTop: "25px",
  paddingTop: "20px",
  borderTop: "1px solid var(--border)",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
};

const dateInfoStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px",
  padding: "18px",
  marginTop: "20px",
  backgroundColor: "var(--soft-background)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
};

const smallLabelStyle = {
  display: "block",
  color: "var(--secondary-text)",
  fontSize: "13px",
  marginBottom: "5px",
};

const helperTextStyle = {
  color: "var(--secondary-text)",
  fontSize: "14px",
};

const attendanceSummaryStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "var(--soft-background)",
  border: "1px solid var(--border)",
  padding: "12px 15px",
  borderRadius: "6px",
  marginBottom: "10px",
};

const swimmerListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  marginTop: "10px",
};

const checkboxRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px",
  borderBottom: "1px solid var(--border)",
};

const radioRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 0",
};

const markedBoxStyle = {
  backgroundColor: "var(--success-background)",
  color: "var(--success-text)",
  padding: "12px 15px",
  borderRadius: "6px",
  marginTop: "20px",
  fontWeight: "bold",
};

const warningBoxStyle = {
  backgroundColor: "var(--warning-background)",
  color: "var(--warning-text)",
  padding: "14px",
  borderRadius: "6px",
  marginTop: "20px",
};

const buttonRowStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
  marginTop: "30px",
  paddingTop: "20px",
  borderTop: "1px solid var(--border)",
};

const closeRowStyle = {
  marginTop: "30px",
  paddingTop: "20px",
  borderTop: "1px solid var(--border)",
};

const buttonStyle = {
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  border: "none",
  borderRadius: "6px",
  padding: "10px 20px",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButtonStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "10px 20px",
  cursor: "pointer",
  fontWeight: "bold",
};

const buttonLinkStyle = {
  display: "inline-block",
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  borderRadius: "6px",
  padding: "10px 18px",
  textDecoration: "none",
  fontWeight: "bold",
};

const closeLinkStyle = {
  display: "inline-block",
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "10px 20px",
  textDecoration: "none",
  fontWeight: "bold",
};

const feedbackSuccessStyle = {
  backgroundColor: "var(--success-background)",
  color: "var(--success-text)",
  padding: "14px 18px",
  borderRadius: "8px",
  marginTop: "20px",
  fontWeight: "bold",
};

const feedbackErrorStyle = {
  backgroundColor: "var(--danger-background)",
  color: "var(--danger-text)",
  padding: "14px 18px",
  borderRadius: "8px",
  marginTop: "20px",
  fontWeight: "bold",
};
