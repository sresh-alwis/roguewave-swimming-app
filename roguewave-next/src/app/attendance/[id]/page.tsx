"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";

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
};

type SessionStatus = "normal" | "cancelled" | "no-session" | "holiday";

type CoachStatus =
  | "present"
  | "absent"
  | "cancelled"
  | "no-session"
  | "holiday";

type SwimmerAttendanceRecord = {
  kind: "swimmers";
  swimmerIds: number[];
  sessionStatus: SessionStatus;
  location: string;
};

type CoachAttendanceRecord = {
  kind: "coach";
  coachStatus: CoachStatus;
  location: string;
};

type AttendanceRecord = SwimmerAttendanceRecord | CoachAttendanceRecord;

type AttendanceStore = Record<string, AttendanceRecord>;

const sessions: Session[] = [
  {
    id: 1,
    name: "RogueWave Learn to Swim",
    role: "Head Coach",
    defaultLocation: "President's College Pool",

    schedules: [
      {
        dayOfWeek: 4,
        startTime: "19:00",
        endTime: "20:00",
      },
      {
        dayOfWeek: 6,
        startTime: "19:00",
        endTime: "20:00",
      },
    ],

    swimmers: [
      {
        id: 1,
        name: "Isali Rozairo",
      },
      {
        id: 2,
        name: "Pawani Rozairo",
      },
      {
        id: 3,
        name: "Swimmer 3",
      },
      {
        id: 4,
        name: "Swimmer 4",
      },
    ],
  },

  {
    id: 2,
    name: "Coach Gayani Adult Class",
    role: "Assistant Coach",
    defaultLocation: "Swimming Pool",

    schedules: [
      {
        dayOfWeek: 3,
        startTime: "19:00",
        endTime: "20:00",
      },
      {
        dayOfWeek: 6,
        startTime: "18:00",
        endTime: "19:00",
      },
      {
        dayOfWeek: 0,
        startTime: "18:00",
        endTime: "19:00",
      },
    ],

    swimmers: [],
  },
];

const initialSavedAttendance: AttendanceStore = {
  "1-2026-09-24": {
    kind: "swimmers",
    swimmerIds: [1, 2, 4],
    sessionStatus: "normal",
    location: "President's College Pool",
  },

  "2-2026-09-23": {
    kind: "coach",
    coachStatus: "present",
    location: "Swimming Pool",
  },
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
      <main style={pageStyle}>
        <section style={cardStyle}>
          <p>Loading attendance...</p>
        </section>
      </main>
    );
  }

  return <AttendanceContent key={sessionId} sessionId={sessionId} />;
}

function AttendanceContent({
  sessionId,
}: {
  sessionId: number;
}) {
  const session = sessions.find((session) => session.id === sessionId);

  const [records, setRecords] = useState<AttendanceStore>(
    initialSavedAttendance,
  );

  const [selectedDate, setSelectedDate] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryDate = urlParams.get("date");
    return queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)
      ? queryDate
      : getTodayKey();
  });

  const [editing, setEditing] = useState(false);

  const [presentSwimmers, setPresentSwimmers] = useState<number[]>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryDate = urlParams.get("date");
    const initialDate =
      queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)
        ? queryDate
        : getTodayKey();
    const key = `${sessionId}-${initialDate}`;
    const existing = initialSavedAttendance[key];
    return existing?.kind === "swimmers" ? existing.swimmerIds : [];
  });

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryDate = urlParams.get("date");
    const initialDate =
      queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)
        ? queryDate
        : getTodayKey();
    const key = `${sessionId}-${initialDate}`;
    const existing = initialSavedAttendance[key];
    return (existing?.kind === "swimmers"
      ? existing.sessionStatus
      : "normal") as SessionStatus;
  });

  const [coachStatus, setCoachStatus] = useState<CoachStatus>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryDate = urlParams.get("date");
    const initialDate =
      queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)
        ? queryDate
        : getTodayKey();
    const key = `${sessionId}-${initialDate}`;
    const existing = initialSavedAttendance[key];
    return (existing?.kind === "coach"
      ? existing.coachStatus
      : "present") as CoachStatus;
  });

  const [location, setLocation] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryDate = urlParams.get("date");
    const initialDate =
      queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)
        ? queryDate
        : getTodayKey();
    const key = `${sessionId}-${initialDate}`;
    const existing = initialSavedAttendance[key];
    const targetSession = sessions.find((s) => s.id === sessionId);
    return existing?.location || targetSession?.defaultLocation || "";
  });

  if (!session) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1>Session not found</h1>

          <Link href="/attendance" style={buttonLinkStyle}>
            Back to Attendance
          </Link>
        </section>
      </main>
    );
  }

  const currentSession = session;

  const hasSwimmers = currentSession.swimmers.length > 0;

  const savedKey = `${sessionId}-${selectedDate}`;

  const existingRecord = selectedDate ? records[savedKey] : undefined;

  const selectedSchedule = selectedDate
    ? getScheduleForDate(currentSession, selectedDate)
    : null;

  const validAttendanceDate = Boolean(selectedSchedule || existingRecord);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setEditing(false);

    const key = `${sessionId}-${date}`;

    const existing = records[key];

    if (existing?.kind === "swimmers") {
      setPresentSwimmers(existing.swimmerIds);

      setSessionStatus(existing.sessionStatus);

      setLocation(existing.location);
    } else if (existing?.kind === "coach") {
      setCoachStatus(existing.coachStatus);

      setLocation(existing.location);
    } else {
      setPresentSwimmers([]);

      setSessionStatus("normal");

      setCoachStatus("present");

      setLocation(currentSession.defaultLocation);
    }
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

  function handleSave() {
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }

    if (selectedDate > getTodayKey()) {
      alert("Attendance cannot be marked for a future date.");
      return;
    }

    if (!selectedSchedule && !existingRecord) {
      alert("This session is not scheduled on the selected date.");
      return;
    }

    const attendanceLocation =
      location.trim() || currentSession.defaultLocation;

    let newRecord: AttendanceRecord;

    if (hasSwimmers) {
      newRecord = {
        kind: "swimmers",

        swimmerIds: sessionStatus === "normal" ? presentSwimmers : [],

        sessionStatus,

        location: attendanceLocation,
      };
    } else {
      newRecord = {
        kind: "coach",

        coachStatus,

        location: attendanceLocation,
      };
    }

    setRecords((current) => ({
      ...current,
      [savedKey]: newRecord,
    }));

    alert(existingRecord ? "Attendance updated." : "Attendance saved.");

    setEditing(false);
  }

  function cancelEdit() {
    if (!existingRecord) {
      return;
    }

    if (existingRecord.kind === "swimmers") {
      setPresentSwimmers(existingRecord.swimmerIds);

      setSessionStatus(existingRecord.sessionStatus);
    } else {
      setCoachStatus(existingRecord.coachStatus);
    }

    setLocation(existingRecord.location);

    setEditing(false);
  }

  return (
    <main style={pageStyle}>
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
                    {formatTime(selectedSchedule.startTime)} -{" "}
                    {formatTime(selectedSchedule.endTime)}
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

                {/* Swimmer Attendance */}
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
                {!hasSwimmers && (
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
                    >
                      {existingRecord ? "Update Attendance" : "Save Attendance"}
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

        {/* Close is ALWAYS visible */}
        <div style={closeRowStyle}>
          <Link href="/attendance" style={closeLinkStyle}>
            Close
          </Link>
        </div>
      </section>
    </main>
  );
}

function getScheduleForDate(session: Session, date: string) {
  const selected = new Date(`${date}T00:00:00`);

  if (Number.isNaN(selected.getTime())) {
    return null;
  }

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
